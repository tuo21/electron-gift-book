# 配置文件系统实现计划

## 问题分析

当前软件的配置管理存在以下问题：

1. **前端配置存储在 localStorage 中**：
   - localStorage 可能被浏览器清理
   - 不同会话之间可能不同步
   - 应用重启后可能丢失配置

2. **后端配置系统不完整**：
   - 只存储 custom_data_path
   - 缺乏统一的配置管理机制

3. **配置分散**：
   - 前端配置在 localStorage
   - 后端配置在 app_config.json
   - 数据库特定配置在每个数据库文件的 Settings 表中

## 解决方案

创建一个统一的配置文件系统，将配置存储在数据保存目录中，每次启动自动读取配置文件。

## 实现计划

### 1. 后端配置系统扩展

#### 1.1 扩展 AppConfig 结构
- 修改 `src-tauri/src/commands.rs` 中的 AppConfig 结构
- 添加前端配置项：eventName, theme, displayStyle, customFontCssName, eventDate, recentBooks, unnamedIndex

#### 1.2 实现配置文件读写功能
- 保持现有的 `get_config_path`、`load_app_config`、`save_app_config` 函数
- 扩展配置文件路径为数据保存目录中的 `config.json`
- 确保配置文件的创建和读写权限

#### 1.3 添加配置管理命令
- 添加 `get_app_config` 命令：获取完整配置
- 添加 `update_app_config` 命令：更新配置
- 添加 `reset_app_config` 命令：重置配置

### 2. 前端配置系统修改

#### 2.1 修改 useAppConfig.ts
- 移除 localStorage 相关代码
- 改为调用后端 Tauri 命令读写配置
- 保持相同的 API 接口，确保兼容性

#### 2.2 实现配置初始化
- 应用启动时调用 `initConfig` 函数
- 从配置文件读取配置
- 处理配置文件不存在的情况（使用默认配置）

#### 2.3 保持配置同步
- 所有配置修改操作都调用后端 API 保存到文件
- 确保配置的实时同步

### 3. 数据迁移

#### 3.1 从 localStorage 迁移配置
- 首次启动时检查 localStorage 中的配置
- 如果存在，迁移到新的配置文件系统
- 迁移后清除 localStorage 中的配置

#### 3.2 配置文件路径管理
- 使用数据保存目录作为配置文件存储位置
- 支持自定义数据路径时，配置文件也随之移动

### 4. 错误处理和恢复

#### 4.1 配置文件损坏处理
- 检测配置文件格式错误
- 提供自动恢复机制，使用默认配置

#### 4.2 权限错误处理
- 处理文件读写权限不足的情况
- 提供用户友好的错误提示

## 技术实现细节

### 配置文件结构

```json
{
  "customDataPath": "string",
  "eventName": "string",
  "theme": "string",
  "displayStyle": "full|compact",
  "customFontCssName": "string|null",
  "eventDate": "string|null",
  "recentBooks": [
    {
      "name": "string",
      "path": "string",
      "lastOpened": "string",
      "theme": "string",
      "eventName": "string",
      "eventDate": "string"
    }
  ],
  "unnamedIndex": 1
}
```

### 前端 API 调用

```typescript
// 加载配置
async function loadConfig() {
  try {
    const response = await bridge.getAppConfig();
    if (response.success && response.data) {
      config.value = {
        ...getDefaultConfig(),
        ...response.data
      };
    }
  } catch (error) {
    console.error('加载配置失败:', error);
    config.value = getDefaultConfig();
  }
}

// 保存配置
async function saveConfig() {
  try {
    await bridge.updateAppConfig(config.value);
  } catch (error) {
    console.error('保存配置失败:', error);
  }
}
```

### 后端命令实现

```rust
#[tauri::command]
pub async fn get_app_config(app: AppHandle) -> Result<AppConfig, String> {
  let config = load_app_config(&app).unwrap_or_else(|| AppConfig::default());
  Ok(config)
}

#[tauri::command]
pub async fn update_app_config(app: AppHandle, config: AppConfig) -> Result<(), String> {
  save_app_config(&app, &config)?;
  Ok(())
}
```

## 风险评估

1. **配置文件损坏风险**：
   - 可能性：低
   - 缓解措施：实现配置文件格式验证和自动恢复机制

2. **权限问题**：
   - 可能性：中
   - 缓解措施：处理权限错误，提供用户友好的错误提示

3. **数据迁移问题**：
   - 可能性：低
   - 缓解措施：实现平滑的数据迁移机制，确保现有配置不丢失

4. **性能影响**：
   - 可能性：极低
   - 缓解措施：配置文件读写操作在启动时执行，对运行时性能影响最小

## 预期效果

1. **配置持久化**：配置将保存在数据保存目录中，不会丢失
2. **跨会话同步**：不同会话之间配置保持一致
3. **统一管理**：所有配置集中在一个文件中管理
4. **向后兼容**：保持与现有 API 的兼容性，不影响现有功能

## 实施步骤

1. **后端实现**：扩展 AppConfig 结构和配置管理命令
2. **前端修改**：更新 useAppConfig.ts 使用新的配置系统
3. **测试验证**：确保配置读写正常，迁移功能工作正常
4. **部署发布**：将新的配置系统集成到应用中

## 总结

通过实现基于文件系统的配置管理系统，可以解决当前配置无法保存的问题，提高应用的可靠性和用户体验。配置文件将存储在数据保存目录中，每次启动时自动读取，确保配置的持久化和一致性。