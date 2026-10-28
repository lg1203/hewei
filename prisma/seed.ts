import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;

async function main() {
  const password = await bcrypt.hash("123456", 10);
  const adminPassword = await bcrypt.hash("admin123", 10);

  await prisma.admin.upsert({
    where: { username: "admin" },
    update: { name: "平台管理员", password: adminPassword },
    create: { username: "admin", password: adminPassword, name: "平台管理员" }
  });

  const merchant = await prisma.merchant.upsert({
    where: { phone: "13800000001" },
    update: { name: "陈老板", password, status: "ACTIVE" },
    create: { phone: "13800000001", password, name: "陈老板" }
  });

  const shop = await prisma.shop.upsert({
    where: { merchantId: merchant.id },
    update: {
      name: "稻香小馆",
      address: "杭州市西湖区文三路 88 号",
      phone: "0571-88886666",
      description: "家常味道，现炒现做。主打杭帮菜与江南小炒，适合朋友小聚和家庭用餐。",
      announcement: "今日新到千岛湖鲈鱼，数量有限；会员消费满 50 元可使用积分抵扣。",
      businessHours: "10:30-21:30",
      cover: img("photo-1517248135467-4c7edcad34c4"),
      pointsEarnRate: 1,
      pointsRedeemRate: 100,
      maxPointsRatio: 50,
      status: "ACTIVE"
    },
    create: {
      merchantId: merchant.id,
      name: "稻香小馆",
      address: "杭州市西湖区文三路 88 号",
      phone: "0571-88886666",
      description: "家常味道，现炒现做。主打杭帮菜与江南小炒，适合朋友小聚和家庭用餐。",
      announcement: "今日新到千岛湖鲈鱼，数量有限；会员消费满 50 元可使用积分抵扣。",
      businessHours: "10:30-21:30",
      cover: img("photo-1517248135467-4c7edcad34c4"),
      pointsEarnRate: 1,
      pointsRedeemRate: 100,
      maxPointsRatio: 50
    }
  });

  const categoryData = [
    { name: "招牌推荐", sort: 1 },
    { name: "江南热炒", sort: 2 },
    { name: "主食汤面", sort: 3 },
    { name: "饮品甜点", sort: 4 }
  ];

  const categories: Record<string, string> = {};
  for (const c of categoryData) {
    const row = await prisma.category.upsert({
      where: { shopId_name: { shopId: shop.id, name: c.name } },
      update: { sort: c.sort },
      create: { shopId: shop.id, name: c.name, sort: c.sort }
    });
    categories[c.name] = row.id;
  }

  const dishes = [
    {
      name: "外婆红烧肉",
      category: "招牌推荐",
      price: 5800,
      description: "五花肉慢火焖煮，肥而不腻，配米饭一绝",
      image: img("photo-1547592180-85f173990554"),
      defaultQty: 40,
      sort: 1,
      isRequired: true
    },
    {
      name: "龙井虾仁",
      category: "招牌推荐",
      price: 6800,
      description: "鲜虾仁配明前龙井，清鲜回甘",
      image: img("photo-1565680018434-b513d5e5fd47"),
      defaultQty: 30,
      sort: 2
    },
    {
      name: "清蒸千岛湖鲈鱼",
      category: "招牌推荐",
      price: 8800,
      description: "当日活鱼，姜丝葱油，肉质细嫩",
      image: img("photo-1519708227418-c8fd9a32b7a2"),
      defaultQty: 15,
      sort: 3
    },
    {
      name: "宫保鸡丁",
      category: "江南热炒",
      price: 3800,
      description: "鸡腿肉丁配花生，微辣酸甜",
      image: img("photo-1525755662778-989d0524087e"),
      defaultQty: 50,
      sort: 1
    },
    {
      name: "麻婆豆腐",
      category: "江南热炒",
      price: 2800,
      description: "嫩豆腐配牛肉末，麻辣鲜香",
      image: img("photo-1547592166-23ac45744acd"),
      defaultQty: 50,
      sort: 2
    },
    {
      name: "干锅有机花菜",
      category: "江南热炒",
      price: 3200,
      description: "花菜脆爽，带一点锅气",
      image: img("photo-1512058564366-18510be2db19"),
      defaultQty: 40,
      sort: 3
    },
    {
      name: "蟹粉豆腐",
      category: "江南热炒",
      price: 4800,
      description: "蟹粉与嫩豆腐同烧，鲜香浓郁",
      image: img("photo-1547592166-23ac45744acd"),
      defaultQty: 25,
      sort: 4
    },
    {
      name: "招牌蛋炒饭",
      category: "主食汤面",
      price: 1800,
      description: "粒粒分明，锅气十足",
      image: img("photo-1603133872878-684f208fb84b"),
      defaultQty: 80,
      sort: 1
    },
    {
      name: "雪菜肉丝面",
      category: "主食汤面",
      price: 2200,
      description: "雪菜咸鲜，汤头清爽",
      image: img("photo-1569718212165-3a8278d5f624"),
      defaultQty: 60,
      sort: 2
    },
    {
      name: "桂花酒酿小圆子",
      category: "饮品甜点",
      price: 1600,
      description: "桂花香气，软糯清甜",
      image: img("photo-1563805042-7684c019e1cb"),
      defaultQty: 40,
      sort: 1
    },
    {
      name: "古法酸梅汤",
      category: "饮品甜点",
      price: 1200,
      description: "乌梅山楂熬煮，冰镇解腻",
      image: img("photo-1544145945-f90425340c7e"),
      defaultQty: 60,
      sort: 2
    },
    {
      name: "明前龙井",
      category: "饮品甜点",
      price: 2000,
      description: "一壶两杯，清香回甘",
      image: img("photo-1544787219-7f47ccb76574"),
      defaultQty: 30,
      sort: 3
    }
  ];

  for (const d of dishes) {
    await prisma.dish.upsert({
      where: { shopId_name: { shopId: shop.id, name: d.name } },
      update: {
        categoryId: categories[d.category],
        price: d.price,
        description: d.description,
        image: d.image,
        defaultQty: d.defaultQty,
        sort: d.sort,
        isRequired: Boolean(d.isRequired),
        status: "ACTIVE"
      },
      create: {
        shopId: shop.id,
        categoryId: categories[d.category],
        name: d.name,
        price: d.price,
        description: d.description,
        image: d.image,
        defaultQty: d.defaultQty,
        sort: d.sort,
        isRequired: Boolean(d.isRequired)
      }
    });
  }

  const tables = [
    { name: "A01", token: "demo-a01" },
    { name: "A02", token: "demo-a02" },
    { name: "A03", token: "demo-a03" },
    { name: "B01", token: "demo-b01" },
    { name: "B02", token: "demo-b02" }
  ];

  for (const t of tables) {
    await prisma.table.upsert({
      where: { shopId_name: { shopId: shop.id, name: t.name } },
      update: { qrToken: t.token },
      create: { shopId: shop.id, name: t.name, qrToken: t.token }
    });
  }

  const membershipPlans = [
    {
      name: "稻香月卡",
      description: "结账 9 折，每次就餐赠 1 份饮品甜点，首月 0 元体验",
      billingCycle: "MONTHLY",
      price: 1990,
      originalPrice: 2990,
      firstMonthFree: true,
      trialDays: 30,
      discountRate: 90,
      freeDrink: true,
      giftCategoryName: "饮品甜点",
      status: "ACTIVE",
      sort: 1
    },
    {
      name: "稻香年卡",
      description: "连续包年更划算，结账 8.5 折，每次就餐赠 1 份饮品甜点",
      billingCycle: "YEARLY",
      price: 19900,
      originalPrice: 23880,
      firstMonthFree: true,
      trialDays: 30,
      discountRate: 85,
      freeDrink: true,
      giftCategoryName: "饮品甜点",
      status: "ACTIVE",
      sort: 2
    }
  ];

  for (const plan of membershipPlans) {
    await prisma.membershipPlan.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan
    });
  }

  const user = await prisma.user.upsert({
    where: { phone: "13900000001" },
    update: { name: "张小明", password, balance: 20000, points: 500 },
    create: {
      phone: "13900000001",
      password,
      name: "张小明",
      balance: 20000,
      points: 500
    }
  });

  const couponCount = await prisma.coupon.count();
  if (couponCount === 0) {
    const now = new Date();
    const end = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
    await prisma.coupon.createMany({
      data: [
        {
          shopId: shop.id,
          title: "满 50 减 10",
          description: "全场通用，单笔订单满 50 元可用",
          type: "FULL_REDUCTION",
          threshold: 5000,
          value: 1000,
          totalQty: 200,
          perUserLimit: 2,
          startAt: now,
          endAt: end,
          source: "MERCHANT"
        },
        {
          shopId: shop.id,
          title: "招牌菜 9 折券",
          description: "单笔订单满 30 元可用，不与其他折扣叠加",
          type: "DISCOUNT",
          threshold: 3000,
          value: 0,
          discountRate: 90,
          totalQty: 100,
          perUserLimit: 1,
          startAt: now,
          endAt: end,
          source: "MERCHANT"
        },
        {
          shopId: null,
          title: "平台新人券 满 30 减 5",
          description: "平台新用户专享，全平台门店通用",
          type: "FULL_REDUCTION",
          threshold: 3000,
          value: 500,
          totalQty: 500,
          perUserLimit: 1,
          startAt: now,
          endAt: end,
          source: "ADMIN"
        }
      ]
    });
  }

  const activityCount = await prisma.activity.count();
  if (activityCount === 0) {
    const now = new Date();
    const end = new Date(now.getTime() + 90 * 24 * 3600 * 1000);
    await prisma.activity.createMany({
      data: [
        {
          title: "新客首单立减 5 元",
          subtitle: "注册即领平台新人券，全平台门店可用",
          content:
            "活动规则：\n1. 新注册用户可在领券中心领取「平台新人券 满 30 减 5」；\n2. 优惠券自领取之日起 30 天内有效；\n3. 每笔账单限用一张优惠券，可与积分抵扣同时使用。",
          poster:
            "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=80",
          link: "/m/coupons",
          status: "ACTIVE",
          sort: 1,
          startAt: now,
          endAt: end
        },
        {
          title: "积分当钱花",
          subtitle: "消费 1 元积 1 分，100 积分抵 1 元",
          content:
            "会员消费结账后自动获得积分，积分可在结账时抵扣现金。\n默认 100 积分抵 1 元，单笔最多抵扣应付金额的 50%，具体以门店设置为准。",
          poster:
            "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=80",
          link: "/m/me",
          status: "ACTIVE",
          sort: 2,
          startAt: now,
          endAt: end
        },
        {
          title: "周末到店 · 招牌菜 9 折",
          subtitle: "领取店铺折扣券，周末聚餐更划算",
          content:
            "活动期间，在「稻香小馆」领券中心领取「招牌菜 9 折券」，单笔订单满 30 元可用。\n数量有限，先到先得。",
          poster:
            "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=80",
          link: "/m/coupons",
          status: "ACTIVE",
          sort: 3,
          startAt: now,
          endAt: end
        },
        {
          title: "充值会员 · 首月 0 元体验",
          subtitle: "结账打折、每次就餐赠饮，连续包月包年更优惠",
          content:
            "会员权益：\n1. 新会员首月 0 元体验 30 天，体验结束后按月/年自动续费；\n2. 结账享会员折扣，可与优惠券、积分抵扣叠加；\n3. 每次就餐结账自动赠送 1 份饮品甜点；\n4. 随时可在会员中心退订，退订后权益保留至本周期结束，到期不再扣费。",
          poster:
            "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=80",
          link: "/m/membership",
          status: "ACTIVE",
          sort: 0,
          startAt: now,
          endAt: end
        }
      ]
    });
  }

  await prisma.config.upsert({
    where: { key: "platform_name" },
    update: { value: "禾味点餐" },
    create: { key: "platform_name", value: "禾味点餐" }
  });
  await prisma.config.upsert({
    where: { key: "points_earn_rate" },
    update: { value: "1" },
    create: { key: "points_earn_rate", value: "1" }
  });
  await prisma.config.upsert({
    where: { key: "points_redeem_rate" },
    update: { value: "100" },
    create: { key: "points_redeem_rate", value: "100" }
  });
  await prisma.config.upsert({
    where: { key: "max_points_ratio" },
    update: { value: "50" },
    create: { key: "max_points_ratio", value: "50" }
  });

  console.log("Seed complete.");
  console.log("Admin:    admin / admin123");
  console.log("Merchant: 13800000001 / 123456");
  console.log("User:     13900000001 / 123456");
  console.log("Shop ID: ", shop.id);
  console.log("User ID: ", user.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
