import child_process from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import readCommit from './getLogFile';
import { default_log_file, commit_log_regx } from './config';

const types = [
  { type: 'fix', section: 'Bug修复' },
  { type: 'feat', section: '新特性' },
  { type: 'docs', section: '文档' },
  { type: 'chore', section: '配置项', hidden: true },
  { type: 'style', section: '格式', hidden: true },
  { type: 'refactor', section: '重构', hidden: true },
  { type: 'perf', section: '性能', hidden: true },
  { type: 'test', section: '测试', hidden: true },
  { type: 'build', section: '构建', hidden: true },
  { type: 'ci', section: 'CI', hidden: true },
  { type: 'revert', section: '回滚', hidden: true },
];

const changelogFallback = `git log --pretty=format:"%s (%h)" --no-merges`;

const { startCommit, endCommit: from, data: oldData } = readCommit();
console.log(startCommit, from);
const to = null;

let command = changelogFallback;
if (from && to) {
  command = `${changelogFallback} ${from}..${to}`;
}

type commitLogsType = { type: string; content: string; commitId: string }[]

child_process.exec(command, async (error, stdout) => {
  const data = stdout.split('\n');
  // console.log(data);

  let commitLogs: commitLogsType = [];
  data.forEach(item => {
    const reg = commit_log_regx;
    const matchData = item.match(reg);
    if (!matchData) return;
    const [, type, content, commitId] = matchData;
    commitLogs.push({
      type: type.trim(),
      content,
      commitId,
    });
  });

  if (commitLogs.length === 0) return;
  const fileHeaderContext = `## commit ${
    from ?? commitLogs[commitLogs.length - 1].commitId
  }~${commitLogs[0].commitId} (${new Date().toLocaleDateString()})\n`;
  await fs.writeFile(
    path.resolve(__dirname, default_log_file),
    Buffer.from(fileHeaderContext)
  );
  // console.log(commitLogs, 'logList');

  types.forEach(async item => {
    if (!item.hidden) {
      const data = commitLogs.filter(log => log.type === item.type);
      if (data.length === 0) return;
      await fs.appendFile(
        path.resolve(__dirname, default_log_file),
        Buffer.from(`
### ${item.section}\n
${data.map(item => '*' + item.content).join('\n')}\n
`)
      );
    }
  });
  fs.appendFile(default_log_file, oldData ?? '');
});
