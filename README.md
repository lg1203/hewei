# 禾味点餐 · 三端点餐系统

一套面向中小餐饮门店的扫码点餐系统，包含 **平台管理员端**、**商户经营端** 和 **用户点餐端**。管理员端与商户端为桌面网页，用户端为移动 H5（按微信小程序的使用场景设计，可直接通过 `web-view` 封装为小程序）。

## 技术栈

- **Next.js 15.5**（App Router）+ React 19 + TypeScript
- **Tailwind CSS 3** + 自研 UI 组件
- **Prisma 6.19** + SQLite
- **JWT + httpOnly Cookie** 鉴权，API 同时支持 `Authorization: Bearer <token>`，便于小程序调用
- Recharts 经营图表、qrcode 桌码生成、bcryptjs 密码哈希

## 快速开始

环境要求：Node.js 18+（推荐 20+）。

```bash
# 1. 安装依赖
npm install

# 2. 初始化数据库并写入演示数据
npm run setup

# 3. 启动开发服务器
npm run dev
```

打开 <http://localhost:3000>。

生产构建：

```bash
npm run build
npm start
```

### 环境变量

项目根目录 `.env`：

```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="diancan-demo-secret-change-me-in-production-2026"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

> 部署到生产环境前务必修改 `AUTH_SECRET`，并将 SQLite 替换为 PostgreSQL / MySQL（修改 `prisma/schema.prisma` 的 `datasource` 后重新 `prisma db push`）。

## 演示账号

| 角色 | 入口 | 账号 | 密码 |
| --- | --- | --- | --- |
| 平台管理员 | `/admin/login` | `admin` | `admin123` |
| 商户 | `/merchant/login` | `13800000001` | `123456` |
| 用户 | `/m/login` | `13900000001` | `123456` |

演示门店「稻香小馆」内置 12 道菜（「外婆红烧肉」为必点菜）、5 张桌台（A01-A03、B01-B02）、店铺券与平台券、月付/年付会员方案及会员活动。演示桌码：

- `/m/scan?token=demo-a01`
- `/m/scan?token=demo-a02`
- `/m/scan?token=demo-a03`
- `/m/scan?token=demo-b01`
- `/m/scan?token=demo-b02`

也可在商户端「桌码管理」中查看/下载每张桌台的二维码。

## 三端功能

### 平台管理员端 `/admin`

- **经营概览**：全平台营业额、订单、商户、会员、积分、优惠券与交易趋势。
- **商户管理**：新增商户及门店、编辑资料、重置密码、启用/停用账号。
- **用户管理**：查看会员余额/积分/消费，支持余额充值、积分调整，以及协助用户修改昵称、手机号、账号状态和重置登录密码。
- **平台优惠券**：创建全平台通用券或指定门店券，支持满减券/折扣券、领取上限、有效期与停用。
- **活动管理**：新增、编辑、停用、删除用户端运营活动，配置标题、副标题、正文、海报、跳转链接、排序和起止时间。
- **会员方案**：配置月付/年付会员的折扣、赠饮分类、首月 0 元体验天数、原价与优惠价，支持启停与删除。
- **全平台订单**：跨门店查询订单、查看明细（含会员折扣与赠饮）。
- **平台设置**：默认积分规则等平台级配置。

### 商户经营端 `/merchant`

- **今日经营**：营业额、订单数、客单价、桌台使用率、待结账桌台、库存预警、分时营业额（24 小时）、热销菜品。
- **线下点餐**：商户代客选桌、加菜、提交订单、关联会员、现金/余额/模拟微信结账；自动校验必点菜并计算会员折扣与赠饮。
- **订单管理**：按状态筛选、搜索、查看明细（含会员折扣与赠饮）、取消未结账订单（自动恢复库存）、去结账。
- **菜品与库存**：分类管理、菜品增删改、上架/下架、必点菜设置、每日库存与售罄状态。
- **桌码管理**：新增/编辑/删除桌台、生成并下载二维码、清台、跳转结账。
- **店铺优惠券**：仅管理本店优惠券。
- **店铺设置**：门店信息、营业时间、公告、积分获得/抵扣比例、单笔积分抵扣上限。

### 用户点餐端 `/m`

- **首页**：附近门店、扫码点餐、领券中心、会员积分与余额、会员入口、平台活动海报。
- **会员中心**：查看当前会员权益与有效期、选择月付/年付方案、首月 0 元体验、余额/模拟微信开通、退订与恢复自动续费、会员交易记录。
- **活动中心**：查看活动列表与详情，支持活动正文、海报和跳转链接。
- **扫码开桌**：扫描桌码开桌；同桌多人可加入同一用餐会话。
- **点餐**：分类浏览、加购、查看今日库存与售罄状态、必点菜提示与拦截、提交订单（支持加菜）。
- **桌台账单**：一桌多笔订单合并展示，选择优惠券、会员折扣、输入积分抵扣、选择余额/模拟微信支付，统一结账；会员自动获赠饮品。
- **领券中心**：领取平台券与店铺券，查看我的券。
- **订单与个人中心**：历史订单、会员状态、积分明细、余额明细、退出登录。

## 核心业务规则

### 桌台与账单

- 每张桌台同一时间只有一个进行中的 `DiningSession`（用餐会话）。
- 用户扫码开桌，或加入已开桌的会话；同桌可多次下单（加菜）。
- 账单按会话汇总所有 `PENDING` 订单，结账时统一支付。
- 结账成功后订单转为 `PAID`、会话关闭、桌台恢复 `IDLE`；商户也可在桌码管理中手动清台。

### 必点菜

- 商户可在菜品编辑中勾选「设为必点菜」；同一用餐会话至少点 1 份必点菜才能下单和结账。
- 校验按会话计算：历史有效订单（非取消）或本次提交中包含必点菜即视为完成；会员赠饮不计入必点菜。
- 用户点餐页、商户线下点餐页和最终结账都会校验，未点齐时返回明确提示并阻止提交/收款。

### 付费会员

- 平台管理员配置会员方案，支持 `MONTHLY` / `YEARLY` 计费周期、结账折扣（如 90 表示 9 折）、每次就餐赠饮及赠饮分类、首月 0 元体验天数、原价/优惠价。
- 新会员首次开通且方案开启首月 0 元时，可 0 元体验指定天数；每个用户仅可享受一次，体验结束后按方案价格自动续费。
- 会员折扣在优惠券之后、积分抵扣之前计算：`小计 - 优惠券 - 会员折扣 - 积分抵扣`；优惠金额按订单金额比例分摊。
- 会员每次就餐结账自动赠送 1 份指定分类的饮品（0 元订单项，标记为赠饮），优先选择有库存的菜品并扣减当日库存。
- 用户可随时退订：关闭自动续费后权益保留至当前周期结束，到期不扣费；也可在到期前恢复自动续费。
- 会员费支付支持余额与模拟微信；余额不足时自动续费失败并置为到期，不产生欠费。

### 优惠券

- 优惠券分 **平台券**（`shopId = null`，全平台或指定门店可用）与 **店铺券**（仅本店可用）。
- 支持满减券（`FULL_REDUCTION`）与折扣券（`DISCOUNT`），可设置门槛、每人限领、发放总量、有效期。
- **每笔账单限用一张优惠券**，可与积分抵扣同时使用。
- 用户进入账单页时，默认选中优惠力度最大的可用券，并默认填入当前可用的最大积分抵扣；用户可手动取消或调整。
- 结账时按各订单金额比例分摊优惠金额。

### 活动

- 活动由平台管理员统一创建，不绑定具体门店，可配置标题、副标题、正文、海报、跳转链接、排序和起止时间。
- 仅 `status = ACTIVE` 且当前时间处于起止时间范围内的活动会在用户端展示；开始/结束时间留空视为不限。
- 用户端首页展示活动横向卡片，`/m/activities` 为活动列表，`/m/activities/[id]` 为活动详情；无可用活动时首页自动隐藏活动区。
- 活动海报当前使用图片 URL（支持 `http(s)://` 或站内路径），留空时显示默认渐变封面。

### 积分

- 默认消费 **1 元 = 1 积分**；默认 **100 积分 = 1 元**。
- 单笔账单最多抵扣应付金额的 **50%**（商户可在店铺设置中调整比例）。
- 积分在结账成功后发放，按实付金额计算；退款/取消场景不发放。
- 管理员可手动调整用户积分，用户可在个人中心查看积分明细。

### 支付

当前为演示环境，支持：

- **余额支付**：从会员余额扣款，需先登录并关联会员。
- **模拟微信支付**：不调用真实微信支付，直接标记支付成功。
- **现金收款**：商户线下点餐结账时使用。

> 接入真实微信支付时，建议新增支付单表与回调路由，在回调中将订单/会话置为已支付，并保证回调幂等。

## 目录结构

```
prisma/
  schema.prisma        # 数据模型
  seed.ts              # 演示数据
  dev.db               # SQLite 数据库（初始化后生成）
miniprogram/           # 微信小程序 web-view 壳工程
scripts/
  smoke.mjs            # 端到端 API 冒烟测试
src/
  app/
    admin/             # 管理员端页面
    merchant/          # 商户端页面
    m/                 # 用户移动端 H5
    api/               # 三端 API
  components/ui/       # 通用 UI 组件
  lib/
    auth.ts            # JWT / Cookie 鉴权
    prisma.ts          # Prisma 单例
    services/orders.ts # 下单、库存、结账、看板等核心逻辑
    constants.ts       # 状态与文案常量
    utils.ts           # 金额/时间格式化
```

## 主要 API

所有接口返回 JSON；鉴权接口通过 httpOnly Cookie 或 `Authorization: Bearer` 传递。

| 模块 | 路径 |
| --- | --- |
| 鉴权 | `POST /api/auth/login`、`POST /api/auth/register`、`GET /api/auth/me`、`POST /api/auth/logout` |
| 公共 | `GET /api/public/shops`、`GET /api/public/shops/[id]`、`GET /api/public/tables/[token]`、`GET /api/public/activities`、`GET /api/public/activities/[id]`、`GET /api/public/membership-plans` |
| 用户 | `POST /api/user/sessions`、`POST /api/user/orders`、`GET /api/user/session/[id]`、`POST /api/user/session/[id]/checkout`、`GET /api/user/orders`、`GET/POST/PATCH /api/user/membership`、`GET/POST /api/user/coupons`、`POST /api/user/coupons/[id]/claim`、`GET /api/user/transactions` |
| 商户 | `GET /api/merchant/dashboard`、`/api/merchant/dishes`、`/api/merchant/tables`、`/api/merchant/orders`、`/api/merchant/coupons`、`/api/merchant/shop`、`POST /api/merchant/session/[id]/checkout` |
| 管理员 | `GET /api/admin/stats`、`/api/admin/merchants`、`/api/admin/users`、`PATCH /api/admin/users/[id]`、`POST /api/admin/users/[id]/recharge`、`POST /api/admin/users/[id]/points`、`/api/admin/coupons`、`/api/admin/activities`、`/api/admin/activities/[id]`、`/api/admin/memberships`、`/api/admin/memberships/[id]`、`/api/admin/orders` |

## 冒烟测试

服务启动后可执行端到端 API 测试（会创建测试订单与优惠券，建议在演示前重置数据）：

```bash
node scripts/smoke.mjs
```

覆盖：公共门店接口、会员方案、三端登录、充值/积分、商户建券、用户开桌下单、必点菜拦截、会员开通/退订、会员折扣与赠饮、领券、积分结账、桌台恢复空闲、商户线下点餐与现金结账。

重置为干净演示数据：

```bash
npx prisma db push --force-reset
npx tsx prisma/seed.ts
```

## 封装为微信小程序

当前用户端是移动 H5，页面已按小程序交互设计。仓库内提供了 `miniprogram/` web-view 壳工程，可快速上线：

1. 在微信公众平台配置业务域名（HTTPS），确保域名已备案。
2. 用微信开发者工具导入 `miniprogram/` 目录，把 `app.js` 中的 `baseUrl` 改为你的 HTTPS 域名。
3. 扫码桌码时，将桌码 token 拼到 URL：`https://your-domain.com/m/scan?token=xxx`；小程序页面也支持 `?token=demo-a01` 或小程序码 `scene=demo-a01`。
4. 由于小程序 web-view 的 Cookie 隔离，建议登录接口返回 token，前端存入 `storage`，所有请求带 `Authorization: Bearer <token>`；后端已支持该方式。
5. 若要使用微信原生登录/支付，可在 `/api/auth/login` 增加 `code2Session` 分支，并接入微信支付 JSAPI 回调。

## 生产部署注意事项

- 修改 `AUTH_SECRET`，使用 HTTPS，并将 Cookie 设置为 `secure`。
- SQLite 仅适合演示；生产建议 PostgreSQL，并为订单号、桌码 token 建唯一索引（模型已包含）。
- 图片当前使用 Unsplash 外链，离线环境会显示渐变占位，可替换为对象存储。
- 真实支付需增加支付单、回调验签、幂等处理与对账任务。
- 建议增加操作日志、软删除与数据导出能力。
