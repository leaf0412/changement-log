# changement-log
generate  git commit change log

### 安装

`npm i changement-log -D`

### 运行

`changement-log`

### 配置文件



支持的配置文件格式如下：

```
.versionrc.cjs
.versionrc.json
.versionrc.js
```

对应的参数：
```

types: Array 
默认的值 ==>
[
  { type: 'fix', section: 'Bug修复' },
  { type: 'feat', section: '新特性' },
  { type: 'docs', section: '文档' }
]
types.type: string, ==> commit 的类型
types.section: string, ==> 类型归类名称
types.hidden: boolean  ==> 是否显示该 commit 类型

logFile: string => 生成的改变日志文件名称，默认名称为 CHANGELOG.md

```

举个栗子：
```
// .changelog.json
{
  "types": [
    { "type": "fix", "section": "Bug修复" },
    { "type": "feat", "section": "新特性" },
    { "type": "docs", "section": "文档" },
    { "type": "chore", "section": "配置项", "hidden": true },
    { "type": "style", "section": "格式", "hidden": true },
    { "type": "refactor", "section": "重构", "hidden": true },
    { "type": "perf", "section": "性能", "hidden": true },
    { "type": "test", "section": "测试", "hidden": true },
    { "type": "build", "section": "构建", "hidden": true },
    { "type": "ci", "section": "CI", "hidden": true },
    { "type": "revert", "section": "回滚", "hidden": true }
  ]
}
```
