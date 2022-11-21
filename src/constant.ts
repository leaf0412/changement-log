export const default_log_file = 'CHANGELOG.md';

export const COMMIT_LOG_REGX =
  /^([\w]+)[(?[\s\S\w\W]*\)?]??[:：]{1}([\s\S\w\W\u4e00-\u9fa5]*) commitid=(\w+)/;

export const COMMIT_ID_REGX = /commitid=(\w+)/;

export const COMMIT_ID_SECTION_REGX = /commitId-section=([\s\w]+)~([\s\w]+)/;

export const DEFAULT_TYPES: {
  type: string;
  section: string;
  hidden?: boolean;
}[] = [
  { type: 'fix', section: 'Bug修复' },
  { type: 'feat', section: '新特性' },
  { type: 'docs', section: '文档' },
];

export type commitLogsType = {
  type: string;
  content: string;
  commitId: string;
}[];

export type configType = {
  types?: {
    type: string;
    section: string;
    hidden?: boolean;
  }[];
  logFile?: string;
};
