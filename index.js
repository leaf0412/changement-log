'use strict';

var child_process = require('child_process');
var fs$2 = require('fs/promises');
var fs = require('fs');
var path$1 = require('path');
var path = require('node:path');
var node_url = require('node:url');
var process = require('node:process');
var fs$1 = require('node:fs');

const default_log_file = 'CHANGELOG.md';
const COMMIT_LOG_REGX = /^([\w]+)[(?[\s\S\w\W]*\)?]??[:：]{1}([\s\S\w\W\u4e00-\u9fa5]*) commitid=(\w+)/;
const COMMIT_ID_REGX = /commitid=(\w+)/;
const COMMIT_ID_SECTION_REGX = /commitId-section=([\s\w]+)~([\s\w]+)/;
const DEFAULT_TYPES = [
    { type: 'fix', section: 'Bug修复' },
    { type: 'feat', section: '新特性' },
    { type: 'docs', section: '文档' },
];

var getFileCommitId = () => {
    let commitInfo = {
        content: '',
        first: null,
        last: null,
    };
    try {
        const log = fs.readFileSync(default_log_file);
        const data = log.toString();
        if (data) {
            const matchData = data.match(COMMIT_ID_SECTION_REGX);
            if (matchData) {
                const [, startCommit, endCommit] = matchData;
                commitInfo = Object.assign(commitInfo, {
                    content: data,
                    first: startCommit.trim(),
                    last: endCommit.trim(),
                });
            }
        }
    }
    catch (err) {
        // console.log(err, 'err');
    }
    return commitInfo;
};

/*
How it works:
`this.#head` is an instance of `Node` which keeps track of its current value and nests another instance of `Node` that keeps the value that comes after it. When a value is provided to `.enqueue()`, the code needs to iterate through `this.#head`, going deeper and deeper to find the last value. However, iterating through every single item is slow. This problem is solved by saving a reference to the last value as `this.#tail` so that it can reference it to add a new value.
*/

class Node {
	value;
	next;

	constructor(value) {
		this.value = value;
	}
}

class Queue {
	#head;
	#tail;
	#size;

	constructor() {
		this.clear();
	}

	enqueue(value) {
		const node = new Node(value);

		if (this.#head) {
			this.#tail.next = node;
			this.#tail = node;
		} else {
			this.#head = node;
			this.#tail = node;
		}

		this.#size++;
	}

	dequeue() {
		const current = this.#head;
		if (!current) {
			return;
		}

		this.#head = this.#head.next;
		this.#size--;
		return current.value;
	}

	clear() {
		this.#head = undefined;
		this.#tail = undefined;
		this.#size = 0;
	}

	get size() {
		return this.#size;
	}

	* [Symbol.iterator]() {
		let current = this.#head;

		while (current) {
			yield current.value;
			current = current.next;
		}
	}
}

function pLimit(concurrency) {
	if (!((Number.isInteger(concurrency) || concurrency === Number.POSITIVE_INFINITY) && concurrency > 0)) {
		throw new TypeError('Expected `concurrency` to be a number from 1 and up');
	}

	const queue = new Queue();
	let activeCount = 0;

	const next = () => {
		activeCount--;

		if (queue.size > 0) {
			queue.dequeue()();
		}
	};

	const run = async (fn, resolve, args) => {
		activeCount++;

		const result = (async () => fn(...args))();

		resolve(result);

		try {
			await result;
		} catch {}

		next();
	};

	const enqueue = (fn, resolve, args) => {
		queue.enqueue(run.bind(undefined, fn, resolve, args));

		(async () => {
			// This function needs to wait until the next microtask before comparing
			// `activeCount` to `concurrency`, because `activeCount` is updated asynchronously
			// when the run function is dequeued and called. The comparison in the if-statement
			// needs to happen asynchronously as well to get an up-to-date value for `activeCount`.
			await Promise.resolve();

			if (activeCount < concurrency && queue.size > 0) {
				queue.dequeue()();
			}
		})();
	};

	const generator = (fn, ...args) => new Promise(resolve => {
		enqueue(fn, resolve, args);
	});

	Object.defineProperties(generator, {
		activeCount: {
			get: () => activeCount,
		},
		pendingCount: {
			get: () => queue.size,
		},
		clearQueue: {
			value: () => {
				queue.clear();
			},
		},
	});

	return generator;
}

class EndError extends Error {
	constructor(value) {
		super();
		this.value = value;
	}
}

// The input can also be a promise, so we await it.
const testElement = async (element, tester) => tester(await element);

// The input can also be a promise, so we `Promise.all()` them both.
const finder = async element => {
	const values = await Promise.all(element);
	if (values[1] === true) {
		throw new EndError(values[0]);
	}

	return false;
};

async function pLocate(
	iterable,
	tester,
	{
		concurrency = Number.POSITIVE_INFINITY,
		preserveOrder = true,
	} = {},
) {
	const limit = pLimit(concurrency);

	// Start all the promises concurrently with optional limit.
	const items = [...iterable].map(element => [element, limit(testElement, element, tester)]);

	// Check the promises either serially or concurrently.
	const checkLimit = pLimit(preserveOrder ? 1 : Number.POSITIVE_INFINITY);

	try {
		await Promise.all(items.map(element => checkLimit(finder, element)));
	} catch (error) {
		if (error instanceof EndError) {
			return error.value;
		}

		throw error;
	}
}

const typeMappings = {
	directory: 'isDirectory',
	file: 'isFile',
};

function checkType(type) {
	if (Object.hasOwnProperty.call(typeMappings, type)) {
		return;
	}

	throw new Error(`Invalid type specified: ${type}`);
}

const matchType = (type, stat) => stat[typeMappings[type]]();

const toPath$1 = urlOrPath => urlOrPath instanceof URL ? node_url.fileURLToPath(urlOrPath) : urlOrPath;

async function locatePath(
	paths,
	{
		cwd = process.cwd(),
		type = 'file',
		allowSymlinks = true,
		concurrency,
		preserveOrder,
	} = {},
) {
	checkType(type);
	cwd = toPath$1(cwd);

	const statFunction = allowSymlinks ? fs$1.promises.stat : fs$1.promises.lstat;

	return pLocate(paths, async path_ => {
		try {
			const stat = await statFunction(path.resolve(cwd, path_));
			return matchType(type, stat);
		} catch {
			return false;
		}
	}, {concurrency, preserveOrder});
}

const toPath = urlOrPath => urlOrPath instanceof URL ? node_url.fileURLToPath(urlOrPath) : urlOrPath;

const findUpStop = Symbol('findUpStop');

async function findUpMultiple(name, options = {}) {
	let directory = path.resolve(toPath(options.cwd) || '');
	const {root} = path.parse(directory);
	const stopAt = path.resolve(directory, options.stopAt || root);
	const limit = options.limit || Number.POSITIVE_INFINITY;
	const paths = [name].flat();

	const runMatcher = async locateOptions => {
		if (typeof name !== 'function') {
			return locatePath(paths, locateOptions);
		}

		const foundPath = await name(locateOptions.cwd);
		if (typeof foundPath === 'string') {
			return locatePath([foundPath], locateOptions);
		}

		return foundPath;
	};

	const matches = [];
	// eslint-disable-next-line no-constant-condition
	while (true) {
		// eslint-disable-next-line no-await-in-loop
		const foundPath = await runMatcher({...options, cwd: directory});

		if (foundPath === findUpStop) {
			break;
		}

		if (foundPath) {
			matches.push(path.resolve(directory, foundPath));
		}

		if (directory === stopAt || matches.length >= limit) {
			break;
		}

		directory = path.dirname(directory);
	}

	return matches;
}

async function findUp(name, options = {}) {
	const matches = await findUpMultiple(name, {...options, limit: 1});
	return matches[0];
}

const CONFIGURATION_FILES = [
    '.changelog.cjs',
    '.changelog.json',
    '.changelog.js',
];
const getConfiguration = async () => {
    let config = {};
    const configPath = await findUp(CONFIGURATION_FILES);
    if (!configPath) {
        return config;
    }
    const ext = path$1.extname(configPath);
    if (ext === '.js' || ext === '.cjs') {
        const jsConfiguration = require(configPath);
        if (typeof jsConfiguration === 'function') {
            config = jsConfiguration();
        }
        else {
            config = jsConfiguration;
        }
    }
    else {
        try {
            config = JSON.parse(fs.readFileSync(configPath).toString());
        }
        catch (err) {
            console.log(err);
        }
    }
    if (typeof config !== 'object') {
        throw Error(`Invalid configuration in ${configPath} provided. Expected an object but found ${typeof config}.`);
    }
    return config;
};

const changelogFallback = `git log --pretty=format:"%s commitid=%h"`;
const getCommitId = (commit) => {
    const matchData = commit.match(COMMIT_ID_REGX);
    if (!matchData)
        return;
    const [, commitId] = matchData;
    return commitId;
};
const headerContent = `# Changelog\nAll notable changes to this project will be documented in this file.`;
const setHeader = (logFile) => {
    fs$2.writeFile(logFile ?? default_log_file, Buffer.from(headerContent));
};
const generateLog = async () => {
    const config = await getConfiguration();
    const { last: from, content: oldContent } = getFileCommitId();
    let command = changelogFallback;
    if (from) {
        command = `${changelogFallback} ${from}..`;
    }
    child_process.exec(command, async (error, stdout) => {
        const data = stdout.split('\n');
        const dataLength = data.length;
        const endCommitId = getCommitId(data[0]);
        const startCommitId = getCommitId(data[dataLength - 1]);
        if (!endCommitId && !startCommitId)
            return;
        let commitLogs = [];
        data.forEach(item => {
            const reg = COMMIT_LOG_REGX;
            const matchData = item.match(reg);
            if (!matchData)
                return;
            const [, type, content, commitId] = matchData;
            commitLogs.push({
                type: type.trim(),
                content: content.trim(),
                commitId,
            });
        });
        if (commitLogs.length === 0)
            return;
        setHeader(config.logFile);
        const tagContent = `\n\n## commitId-section=${from ?? startCommitId}~${endCommitId} (${new Date().toLocaleDateString()})\n`;
        await fs$2.appendFile(default_log_file, Buffer.from(tagContent));
        const types = config.types ?? DEFAULT_TYPES;
        const typesLength = types.length;
        for (let i = 0; i < typesLength; i++) {
            const item = types[i];
            if (item.hidden)
                continue;
            const data = commitLogs.filter(log => log.type === item.type);
            if (data.length === 0)
                continue;
            const typeContent = data.map(item => `- ${item.content}`);
            await fs$2.appendFile(default_log_file, Buffer.from('\n### ' + item.section + '\n\n' + typeContent.join('\n') + '\n'));
        }
        await fs$2.appendFile(default_log_file, oldContent.replace(headerContent, ''));
    });
};

module.exports = generateLog;
