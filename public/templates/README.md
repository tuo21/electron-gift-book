# PDF模板使用说明

## 目录结构

```
public/templates/
├── original/           # 原始模板图片（设计稿导出）
│   ├── red/           # 喜庆红模板
│   │   ├── cover.jpg
│   │   ├── content.jpg
│   │   ├── statistics.jpg
│   │   └── backcover.jpg
│   └── gray/          # 肃穆灰模板
│       ├── cover.jpg
│       ├── content.jpg
│       ├── statistics.jpg
│       └── backcover.jpg
├── red/               # 优化后的喜庆红模板（自动生成）
└── gray/              # 优化后的肃穆灰模板（自动生成）
```

## 模板规格

- **页面尺寸**: 842px × 595px（横版A4）
- **推荐格式**: JPEG（质量85%）
- **色彩模式**: RGB

## 使用流程

### 1. 准备模板图片

将设计稿导出的模板图片放入 `public/templates/original/` 目录：
- `original/red/` - 喜庆红模板
- `original/gray/` - 肃穆灰模板

每个模板需要4张图片：
- `cover.jpg` - 封面
- `content.jpg` - 内容页
- `statistics.jpg` - 统计页
- `backcover.jpg` - 封底

### 2. 优化模板图片

运行优化脚本：

```bash
npm run optimize-templates
```

这将：
- 调整图片尺寸为 842×595px
- 压缩图片质量为 85%
- 输出到 `templates/red/` 和 `templates/gray/` 目录

### 3. 创建占位图片（开发测试用）

如果没有设计好的模板图片，可以创建占位图片：

```bash
npm run create-placeholder
```

## 数据定位配置

模板上的数据位置配置在 `electron/pdfTemplateConfig.ts` 文件中。

### 定位信息说明

根据设计稿输出的定位信息（`PDF位置信息.js`）：

```javascript
// 页面尺寸：842px × 595px（横版A4）

cover: {
  文字内容区: { width: 341px, height: 77px, left: 251px, top: 461px }
  // 两排文字：上面是项目名称，下面是日期
}

content: {
  页眉区域: { left: 41px, top: 21px, width: 760px, height: 35px }
  列表区域: { left: 41px, top: 98px, width: 760px, height: 401px }
  // 每页15列，间距5px，列宽46px
  页脚区域: { left: 41px, top: 518px, width: 760px, height: 30px }
}

statistics: {
  标题: { left: 361px, top: 137px, width: 120px, height: 35px }
  内容区域: { left: 270px, top: 193px, width: 302px, height: 230px }
}

backcover: {
  文字1: { left: 307px, top: 263px } // "做一款好用的电子礼金簿"
  文字2: { left: 364px, top: 310px } // "微信公众号：说自"
}
```

## PDF体积优化

### 优化策略

| 优化项 | 推荐值 | 说明 |
|--------|--------|------|
| 分辨率 | 842×595px | 匹配PDF页面尺寸 |
| 图片格式 | JPEG | 质量设置85% |
| 压缩方式 | mozjpeg | 更好的压缩比 |
| PDF压缩 | 对象流 | PDF-lib内置 |

### 预期效果

- 原始图片（每张约500KB）→ 优化后（每张约50KB）
- PDF总体积减少约80-90%

## 注意事项

1. 模板图片必须严格按照设计稿尺寸导出
2. 文字区域需要预留足够空间
3. 两套模板使用相同的定位配置
4. 修改定位配置后需要重新测试PDF输出效果
