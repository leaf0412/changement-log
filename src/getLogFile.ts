import fs from 'fs';
import { resolve } from 'path';
import { default_log_file } from './config';

export default () => {
  let commitInfo = {
    data: null,
    startCommit: null,
    endCommit: null,
  };
  try {
    const log = fs.readFileSync(resolve(__dirname, default_log_file));
    const data = log.toString();

    if (data) {
      const regx = /^## commit ([\s\w]+)~([\s\w]+)/;
      const matchData = data.match(regx);
      if (matchData) {
        const [, startCommit, endCommit] = matchData;
        commitInfo = Object.assign(commitInfo, {
          data: log,
          startCommit: startCommit.trim(),
          endCommit: endCommit.trim(),
        });
      }
    }
  } catch (err) {
    // console.log(err, 'err');
  }
  return commitInfo;
};
