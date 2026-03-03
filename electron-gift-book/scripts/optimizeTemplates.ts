/**
 * 图片优化工具
 * 用于优化PDF模板图片，减少PDF体积
 * 
 * 使用方法：
 * 1. 将原始模板图片放入 templates/original/ 目录
 * 2. 运行 npm run optimize-templates
 * 3. 优化后的图片输出到 templates/red/ 和 templates/gray/ 目录
 */

import sharp from 'sharp'
import * as fs from 'fs'
import * as path from 'path'

const PDF_PAGE_SIZE = {
  width: 842,
  height: 595
}

const OPTIMIZE_OPTIONS = {
  quality: 85,
  mozjpeg: true
}

interface TemplateConfig {
  name: string
  outputDir: string
  files: string[]
}

const TEMPLATES: TemplateConfig[] = [
  {
    name: '喜庆红',
    outputDir: 'red',
    files: ['cover.jpg', 'content.jpg', 'statistics.jpg', 'backcover.jpg']
  },
  {
    name: '肃穆灰',
    outputDir: 'gray',
    files: ['cover.jpg', 'content.jpg', 'statistics.jpg', 'backcover.jpg']
  }
]

async function optimizeImage(
  inputPath: string,
  outputPath: string
): Promise<{ originalSize: number; optimizedSize: number; ratio: number }> {
  const originalStats = await fs.promises.stat(inputPath)
  
  await sharp(inputPath)
    .resize(PDF_PAGE_SIZE.width, PDF_PAGE_SIZE.height, {
      fit: 'cover',
      withoutEnlargement: true
    })
    .jpeg({
      quality: OPTIMIZE_OPTIONS.quality,
      mozjpeg: OPTIMIZE_OPTIONS.mozjpeg
    })
    .toFile(outputPath)
  
  const optimizedStats = await fs.promises.stat(outputPath)
  const ratio = (1 - optimizedStats.size / originalStats.size) * 100
  
  return {
    originalSize: originalStats.size,
    optimizedSize: optimizedStats.size,
    ratio
  }
}

async function processTemplates(baseDir: string): Promise<void> {
  console.log('开始优化模板图片...\n')
  
  for (const template of TEMPLATES) {
    console.log(`处理模板: ${template.name}`)
    console.log('-'.repeat(40))
    
    const outputDir = path.join(baseDir, 'templates', template.outputDir)
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
    
    for (const file of template.files) {
      const inputPath = path.join(baseDir, 'templates', 'original', template.outputDir, file)
      const outputPath = path.join(outputDir, file)
      
      if (fs.existsSync(inputPath)) {
        try {
          const result = await optimizeImage(inputPath, outputPath)
          console.log(`  ${file}: ${(result.originalSize / 1024).toFixed(1)}KB → ${(result.optimizedSize / 1024).toFixed(1)}KB (减少 ${result.ratio.toFixed(1)}%)`)
        } catch (error) {
          console.error(`  ${file}: 优化失败 - ${error}`)
        }
      } else {
        console.log(`  ${file}: 源文件不存在，跳过`)
      }
    }
    
    console.log('')
  }
  
  console.log('模板图片优化完成！')
}

async function createPlaceholderImages(baseDir: string): Promise<void> {
  console.log('创建占位图片...\n')
  
  for (const template of TEMPLATES) {
    const outputDir = path.join(baseDir, 'templates', template.outputDir)
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
    
    for (const file of template.files) {
      const outputPath = path.join(outputDir, file)
      
      if (!fs.existsSync(outputPath)) {
        const bgColor = template.outputDir === 'red' 
          ? { r: 196, g: 74, b: 61 }
          : { r: 74, g: 74, b: 74 }
        
        await sharp({
          create: {
            width: PDF_PAGE_SIZE.width,
            height: PDF_PAGE_SIZE.height,
            channels: 3,
            background: bgColor
          }
        })
        .jpeg({ quality: 85 })
        .toFile(outputPath)
        
        console.log(`  创建占位图片: ${template.name}/${file}`)
      }
    }
  }
  
  console.log('\n占位图片创建完成！')
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const baseDir = args[0] || path.join(__dirname, '..', 'public')
  
  if (args.includes('--placeholder')) {
    await createPlaceholderImages(baseDir)
  } else {
    await processTemplates(baseDir)
  }
}

main().catch(console.error)

export { optimizeImage, processTemplates, createPlaceholderImages }
