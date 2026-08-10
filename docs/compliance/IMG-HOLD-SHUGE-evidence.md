# IMG-HOLD-SHUGE 逐文件证据清单

> 核验日期：2026-08-09  
> 当前状态：`hold`  
> 结论：原作年代足以支持公共领域判断，但当前数字扫描件的商业使用与改编证据不完整。

## 1. 范围与复核方式

- 受控资源：5 个模块 JPEG 和 1 个宿主副本，共 6 个路径。
- 当前进入小程序包：4 个路径；`IMG-S3C.jpg`、`IMG-S4A.jpg` 被 `project.config.json` 排除。
- 机器可读的文件归属、最终 SHA-256 和 `bundledFiles` 以 `plate21/module/assets/third-party-lock.json` 为准。
- 复核命令：`npm run audit:images`，或 `node test/audit-image-evidence.js`。
- `test/gen-raw/IMG-F06.png`、`IMG-S2A.png`、`IMG-S3C.png`、`IMG-S4A.png` 及 `test/gen-img-c01.png` 是已被替换的 AI 备选，不是当前 JPEG 的扫描来源证据。

## 2. 逐文件清单

| 路径 | 包状态 | 当前来源证据 | 最终 JPEG SHA-256 |
|---|---|---|---|
| `assets/host/IMG-F06.jpg` | bundled | 模块文件的相同内容宿主副本 | `4728d6b611d583ce368e41bf1d018ad7aa97308324d8d6a676a3fbdbe29b3d3b` |
| `plate21/module/assets/img/IMG-F06.jpg` | bundled | 工程记录称来自书格扫描；原始下载文件和页码映射缺失 | `4728d6b611d583ce368e41bf1d018ad7aa97308324d8d6a676a3fbdbe29b3d3b` |
| `plate21/module/assets/img/IMG-S2A.jpg` | bundled | 工程记录称来自书格扫描；原始下载文件和页码映射缺失 | `b0b19a43240632b83b1546440e0da5d05d1f0e4a8de7ab1c46fcd685929e9396` |
| `plate21/module/assets/img/IMG-S3C.jpg` | ignored | 工程记录称来自书格扫描；原始下载文件和页码映射缺失 | `2cbf2df7891ff83c875c7aab033cf5587c7854abf19a0471225241aeb90713a8` |
| `plate21/module/assets/img/IMG-S4A.jpg` | ignored | 工程记录称来自书格扫描；原始下载文件和页码映射缺失 | `29ad535d3d297d2961a28682f3965e12f6ae1a6ecd69ddcbc83686c756cd51bd` |
| `plate21/module/assets/img/img-c01.jpg` | bundled | 工程记录和当前图像链归入历史扫描；原始下载文件和页码映射缺失 | `9b11b0c65dbdfe5c1ceb71c6157f284761ff4fd07d3f2f3366575275d8115cb3` |

## 3. 上游线索

### 书格资源页

- 资源页：<https://old.shuge.org/ebook/xi-yang-lou-tong-ban-hua/>。
- 页面说明作品为伊兰泰作画、中国工匠雕刻，乾隆五十一年即 1786 年刻成，共 20 幅。
- 页面说明其展示和下载版本来自英国曼彻斯特大学约翰赖兰兹图书馆藏本，并另含一张彩色图。
- 页面提供预览 JPG 和 PDF 下载入口，但本仓库没有保留当时实际下载包、下载时间、原始文件 SHA-256 或本项目五图对应的准确页码。

### 书格版权说明

- 说明页：<https://www.shuge.org/about/shuge/>。
- 书格称分享内容限定为公共版权领域书籍，不对文献资源新增版权，并鼓励再加工、再创造和再发布。
- 同一说明也称资源来自各图书馆或机构公开内容，并可能经过重新编辑整理。
- 书格的概括性说明不能替代源馆对具体数字文件的 item-level 授权，也不能扩大源馆授予的权利。

### 曼彻斯特数字馆条款

- 条款页：<https://www.digitalcollections.manchester.ac.uk/terms/>。
- 条款称大学拥有或获许可使用网站及其内容的知识产权，包括图片、艺术作品和文件。
- 默认只允许为个人、非商业目的访问、下载和打印摘录。
- 未经明确许可，不得直接或间接用于商业目的，不得修改数字副本，也不得销售、转让、展示或再许可。
- 因书格页明确指向该馆藏本，而本项目没有 item-level 开放许可或书面授权，不能仅凭原作进入公共领域就放行当前扫描件。

## 4. 风险结论

- 1786 年铜版画原作本身与现代数字扫描文件是两个需要分别判断的权利层次。
- 当前证据足以说明原作年代和可能来源，不足以证明本项目取得了当前数字文件的商业复制、分发和改编权。
- 当前 JPEG 还经历裁切、缩放、重压缩和宿主复制；曼彻斯特默认条款明确限制修改，风险与实际使用方式直接冲突。
- 因缺原始下载包，现有最终文件也无法与书格预览、PDF 或曼彻斯特 item 文件做哈希闭环。

## 5. 缺失证据

- 五个逻辑图片对应的书格下载文件、准确页码和原始 SHA-256。
- 曼彻斯特馆藏 item URL、item ID 和逐项 rights statement。
- 明确允许商业复制、分发、展示、裁切、重压缩和改编的许可文本或馆方书面授权。
- 从原始下载文件到当前 JPEG 的处理记录和中间文件哈希。
- 项目版权责任人的书面审批记录。

## 6. 放行或替换条件

`IMG-HOLD-SHUGE` 只有两条可接受路径：

1. 证据补齐：取得馆方或有权授权方对具体数字文件的书面商业许可，补齐原始文件、页码、哈希、处理链和审批记录。
2. 素材替换：使用 item 页面明确标注 `CC0`、`Public Domain Mark` 或等效商业开放许可的扫描，重新保存来源页、原始文件、下载日期、许可快照和 SHA-256。

书格的站点说明或“原作公有领域”判断本身不能作为 `approved` 条件。无法补齐时，必须替换 3 个 bundled 模块文件，并同步替换 `assets/host/IMG-F06.jpg`。
