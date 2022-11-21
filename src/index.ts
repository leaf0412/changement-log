import child_process from 'child_process';
import fs from 'fs/promises';
import getFileCommitId from './getLogFile';
import {
  default_log_file,
  COMMIT_LOG_REGX,
  COMMIT_ID_REGX,
  DEFAULT_TYPES,
  commitLogsType,
  configType,
} from './constant';
import getConfiguration from './configuration';

const changelogFallback = `git log --pretty=format:"%s commitid=%h"`;

const getCommitId = (commit: string) => {
  const matchData = commit.match(COMMIT_ID_REGX);
  if (!matchData) return;
  const [, commitId] = matchData;
  return commitId;
};

const headerContent = `# Changelog\nAll notable changes to this project will be documented in this file.`;

const setHeader = (logFile: string | null | undefined) => {
  fs.writeFile(logFile ?? default_log_file, Buffer.from(headerContent));
};

const generateLog = async () => {
  const config: configType = await getConfiguration();

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

    if (!endCommitId && !startCommitId) return;

    let commitLogs: commitLogsType = [];
    data.forEach(item => {
      const reg = COMMIT_LOG_REGX;
      const matchData = item.match(reg);
      if (!matchData) return;
      const [, type, content, commitId] = matchData;
      commitLogs.push({
        type: type.trim(),
        content: content.trim(),
        commitId,
      });
    });

    if (commitLogs.length === 0) return;

    setHeader(config.logFile);

    const tagContent = `\n\n## commitId-section=${
      from ?? startCommitId
    }~${endCommitId} (${new Date().toLocaleDateString()})\n`;
    await fs.appendFile(default_log_file, Buffer.from(tagContent));
    const types = config.types ?? DEFAULT_TYPES;
    const typesLength = types.length;
    for (let i = 0; i < typesLength; i++) {
      const item = types[i];
      if (item.hidden) continue;
      const data = commitLogs.filter(log => log.type === item.type);
      if (data.length === 0) continue;
      const typeContent = data.map(item => `- ${item.content}`);
      await fs.appendFile(
        default_log_file,
        Buffer.from(
          '\n### ' + item.section + '\n\n' + typeContent.join('\n') + '\n'
        )
      );
    }

    await fs.appendFile(
      default_log_file,
      oldContent.replace(headerContent, '')
    );
  });
};

export default generateLog;
