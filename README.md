# Y.Project

## Overview

一个仅前端的小 Demo：将“云存储（作为 SSOT）”与 GitHub 审批流程结合。

- 云存储 SSOT：使用浏览器 `localStorage` 模拟
- GitHub 审批：在前端模拟 reviewer 的 approve / request changes 动作
- 所有审批动作都回写到同一份 SSOT 状态

## Getting Started

```bash
npm install
npm run build
```

然后直接在浏览器打开项目根目录下的 `index.html`（会加载 `dist/main.js`）。

## Demo Flow

1. 创建一个 PR（标题/描述）
2. 在审批面板选择 reviewer
3. 点击 `Approve` 或 `Request changes`
4. 页面底部可查看云存储 SSOT 快照（单一真相源）

## Licensing

This project is dual-licensed:

1. [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE)
2. Commercial License

For commercial use without AGPL-3.0 obligations, please [contact us](mailto:email@alterxyz.org).
