import fs from 'fs';
import { default_log_file, COMMIT_ID_SECTION_REGX } from './constant';

export default () => {
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
  } catch (err) {
    // console.log(err, 'err');
  }
  return commitInfo;
};
