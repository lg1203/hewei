const BASE = process.env.BASE_URL || "http://localhost:3000";

let cookie = "";

async function api(path, options = {}) {
  const { method = "GET", body, useCookie = true } = options;
  const headers = {};
  if (useCookie && cookie) headers.cookie = cookie;
  if (body !== undefined) headers["content-type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const data = await res.json().catch(() => null);
  const setCookies = res.headers.getSetCookie?.() || [];
  return { status: res.status, data, setCookies };
}

function assert(condition, message) {
  if (!condition) throw new Error(`断言失败：${message}`);
}

async function login(role, account, password) {
  const res = await api("/api/auth/login", {
    method: "POST",
    body: { role, account, password },
    useCookie: false
  });
  assert(res.status === 200, `${role} 登录失败：${JSON.stringify(res.data)}`);
  const raw = res.setCookies[0];
  assert(raw, `${role} 登录未返回 Cookie`);
  return raw.split(";")[0];
}

async function main() {
  console.log("1. 公共接口");
  const shopsRes = await api("/api/public/shops", { useCookie: false });
  assert(shopsRes.status === 200 && shopsRes.data.shops.length, "门店列表");
  const shop = shopsRes.data.shops[0];
  const menuRes = await api(`/api/public/shops/${shop.id}`, { useCookie: false });
  assert(menuRes.status === 200 && menuRes.data.id === shop.id, "门店菜单");
  const dishes = menuRes.data.categories.flatMap((c) => c.dishes);
  const availableDishes = dishes.filter((d) => !d.soldOut && d.remaining >= 2);
  assert(availableDishes.length >= 2, "存在可售菜品");
  const requiredDishes = availableDishes.filter((d) => d.isRequired);
  assert(requiredDishes.length >= 1, "存在可售必点菜");
  const optionalDishes = availableDishes.filter((d) => !d.isRequired);
  assert(optionalDishes.length >= 1, "存在可售非必点菜");
  const plansRes = await api("/api/public/membership-plans", { useCookie: false });
  assert(
    plansRes.status === 200 && plansRes.data.plans.length >= 1,
    "会员方案列表"
  );
  const tableRes = await api("/api/public/tables/demo-a02", { useCookie: false });
  assert(tableRes.status === 200 && tableRes.data.table.name === "A02", "桌码解析");
  console.log(
    `   门店：${shop.name}，可售菜品：${availableDishes.length} 道，必点菜：${requiredDishes
      .map((d) => d.name)
      .join("、")}`
  );

  console.log("2. 管理员端");
  cookie = await login("ADMIN", "admin", "admin123");
  const statsRes = await api("/api/admin/stats");
  assert(statsRes.status === 200, "管理员统计");
  assert(statsRes.data.stats.merchantCount >= 1, "商户数量");
  const usersRes = await api("/api/admin/users");
  assert(usersRes.status === 200, "用户列表");
  const demoUser = usersRes.data.users.find((u) => u.phone === "13900000001");
  assert(demoUser, "演示用户存在");
  const beforeRecharge = demoUser.balance;
  const rechargeRes = await api(`/api/admin/users/${demoUser.id}/recharge`, {
    method: "POST",
    body: { amount: 10000, note: "冒烟测试充值" }
  });
  assert(rechargeRes.status === 200, "管理员充值");
  assert(rechargeRes.data.user.balance === beforeRecharge + 10000, "充值到账");
  const pointsRes = await api(`/api/admin/users/${demoUser.id}/points`, {
    method: "POST",
    body: { amount: 100, note: "冒烟测试积分" }
  });
  assert(pointsRes.status === 200, "管理员调整积分");
  const merchantsRes = await api("/api/admin/merchants");
  assert(merchantsRes.status === 200 && merchantsRes.data.merchants.length, "商户管理列表");
  const profileUpdate = await api(`/api/admin/users/${demoUser.id}`, {
    method: "PATCH",
    body: { name: demoUser.name, phone: demoUser.phone, status: demoUser.status }
  });
  assert(profileUpdate.status === 200, "管理员修改用户资料");
  assert(!("password" in profileUpdate.data.user), "用户资料不返回密码");
  const activityRes = await api("/api/admin/activities", {
    method: "POST",
    body: {
      title: `冒烟活动 ${Date.now()}`,
      subtitle: "用于验证活动管理接口",
      content: "活动正文",
      status: "ACTIVE",
      sort: 99
    }
  });
  assert(activityRes.status === 200, "管理员创建活动");
  const activityId = activityRes.data.activity.id;
  const publicActivities = await api("/api/public/activities", { useCookie: false });
  assert(
    publicActivities.status === 200 &&
      publicActivities.data.activities.some((a) => a.id === activityId),
    "用户端活动列表"
  );
  const publicActivity = await api(`/api/public/activities/${activityId}`, {
    useCookie: false
  });
  assert(publicActivity.status === 200, "用户端活动详情");
  const activityPatch = await api(`/api/admin/activities/${activityId}`, {
    method: "PATCH",
    body: { status: "DISABLED" }
  });
  assert(activityPatch.status === 200, "管理员停用活动");
  const hiddenActivity = await api(`/api/public/activities/${activityId}`, {
    useCookie: false
  });
  assert(hiddenActivity.status === 404, "停用活动不再展示");
  const activityDelete = await api(`/api/admin/activities/${activityId}`, {
    method: "DELETE"
  });
  assert(activityDelete.status === 200, "管理员删除活动");
  const adminPlans = await api("/api/admin/memberships");
  assert(
    adminPlans.status === 200 && adminPlans.data.plans.length >= 1,
    "管理员会员方案列表"
  );
  console.log(`   管理员统计正常，演示用户充值 ${beforeRecharge} -> ${rechargeRes.data.user.balance} 分，活动与会员方案管理正常`);

  console.log("3. 商户端");
  cookie = await login("MERCHANT", "13800000001", "123456");
  const dashboardRes = await api("/api/merchant/dashboard");
  assert(dashboardRes.status === 200 && dashboardRes.data.shop.id === shop.id, "商户看板");
  const merchantDishesRes = await api("/api/merchant/dishes");
  assert(merchantDishesRes.status === 200 && merchantDishesRes.data.dishes.length, "商户菜品");
  const tablesRes = await api("/api/merchant/tables");
  assert(tablesRes.status === 200 && tablesRes.data.tables.length >= 3, "商户桌台");
  const couponRes = await api("/api/merchant/coupons", {
    method: "POST",
    body: {
      title: `冒烟测试券 ${Date.now()}`,
      description: "满 30 减 3",
      type: "FULL_REDUCTION",
      threshold: 3000,
      value: 300,
      totalQty: 10,
      perUserLimit: 1
    }
  });
  assert(couponRes.status === 200, "商户创建优惠券");
  console.log(`   商户看板正常，桌台 ${tablesRes.data.tables.length} 张，优惠券创建成功`);

  console.log("4. 用户端下单");
  cookie = await login("USER", "13900000001", "123456");
  const profileRes = await api("/api/user/profile");
  assert(profileRes.status === 200 && profileRes.data.user.phone === "13900000001", "用户资料");
  const membershipOverview = await api("/api/user/membership");
  assert(
    membershipOverview.status === 200 &&
      membershipOverview.data.plans.length >= 1,
    "会员中心方案"
  );
  let memberActive = Boolean(membershipOverview.data.membership);
  let subscribedThisRun = false;
  if (!memberActive && membershipOverview.data.trialEligible) {
    const trialPlan =
      membershipOverview.data.plans.find((p) => p.firstMonthFree) ||
      membershipOverview.data.plans[0];
    const subscribeRes = await api("/api/user/membership", {
      method: "POST",
      body: { planId: trialPlan.id, paymentMethod: "WECHAT" }
    });
    assert(
      subscribeRes.status === 200 &&
        subscribeRes.data.trial === true &&
        subscribeRes.data.charged === 0,
      `首月 0 元体验开通失败：${JSON.stringify(subscribeRes.data)}`
    );
    memberActive = true;
    subscribedThisRun = true;
  }
  const openRes = await api("/api/user/sessions", {
    method: "POST",
    body: { tableToken: "demo-a02" }
  });
  assert(openRes.status === 200 && openRes.data.session.id, "扫码开桌");
  const sessionId = openRes.data.session.id;
  const missingRequired = await api("/api/user/orders", {
    method: "POST",
    body: {
      tableToken: "demo-a02",
      items: [{ dishId: optionalDishes[0].id, quantity: 1 }],
      remark: "冒烟测试未点必点菜"
    }
  });
  assert(
    missingRequired.status !== 200 &&
      String(missingRequired.data?.error || "").includes("必点"),
    "未点必点菜不能下单"
  );
  const orderItems = [
    ...requiredDishes.map((dish) => ({ dishId: dish.id, quantity: 1 })),
    { dishId: optionalDishes[0].id, quantity: 1 }
  ];
  const orderRes = await api("/api/user/orders", {
    method: "POST",
    body: { tableToken: "demo-a02", items: orderItems, remark: "冒烟测试订单" }
  });
  assert(orderRes.status === 200 && orderRes.data.order.status === "PENDING", "用户下单");
  const billRes = await api(`/api/user/session/${sessionId}`);
  assert(billRes.status === 200 && billRes.data.bill.pendingSubtotal > 0, "账单加载");
  assert(
    billRes.data.bill.requiredDishes.length >= 1 &&
      billRes.data.bill.missingRequiredDishes.length === 0,
    "账单必点菜校验"
  );
  const subtotal = billRes.data.bill.pendingSubtotal;
  console.log(
    `   开桌成功，账单小计 ${subtotal / 100} 元，会员状态：${
      memberActive ? "生效中" : "未开通"
    }`
  );

  console.log("5. 优惠券与积分结账");
  const availableRes = await api("/api/user/coupons?scope=available");
  assert(availableRes.status === 200, "可领优惠券");
  const claimable = availableRes.data.coupons.find(
    (c) =>
      c.threshold <= subtotal &&
      c.claimedByMe < c.perUserLimit &&
      c.claimedQty < c.totalQty
  );
  assert(claimable, "存在可领取优惠券");
  const claimRes = await api(`/api/user/coupons/${claimable.id}/claim`, {
    method: "POST"
  });
  assert(claimRes.status === 200, "领取优惠券");
  const mineRes = await api("/api/user/coupons?scope=mine");
  assert(mineRes.status === 200 && mineRes.data.coupons.length, "我的优惠券");
  const userCoupon = mineRes.data.coupons.find(
    (uc) => uc.status === "UNUSED" && uc.coupon.id === claimable.id
  );
  assert(userCoupon, "优惠券已进入我的券包");
  const checkoutRes = await api(`/api/user/session/${sessionId}/checkout`, {
    method: "POST",
    body: {
      userCouponId: userCoupon.id,
      pointsUsed: 100,
      paymentMethod: "BALANCE"
    }
  });
  assert(checkoutRes.status === 200, `结账失败：${JSON.stringify(checkoutRes.data)}`);
  assert(checkoutRes.data.total < subtotal, "优惠后金额应减少");
  assert(checkoutRes.data.session.status === "CLOSED", "账单已关闭");
  if (memberActive) {
    assert(checkoutRes.data.memberDiscount > 0, "会员折扣已生效");
    assert(checkoutRes.data.membership?.planName, "结账返回会员方案");
    assert(checkoutRes.data.giftDrink, "会员赠饮已生成");
  }
  if (subscribedThisRun) {
    const cancelRes = await api("/api/user/membership", {
      method: "PATCH",
      body: { autoRenew: false }
    });
    assert(
      cancelRes.status === 200 && cancelRes.data.membership.autoRenew === false,
      "关闭自动续费"
    );
    const resumeRes = await api("/api/user/membership", {
      method: "PATCH",
      body: { autoRenew: true }
    });
    assert(
      resumeRes.status === 200 && resumeRes.data.membership.autoRenew === true,
      "恢复自动续费"
    );
  }
  const tableAfter = await api("/api/public/tables/demo-a02", { useCookie: false });
  assert(tableAfter.data.table.status === "IDLE", "结账后桌台恢复空闲");
  const ordersRes = await api("/api/user/orders");
  assert(
    ordersRes.status === 200 &&
      ordersRes.data.orders.some((o) => o.status === "PAID"),
    "用户订单已结账"
  );
  console.log(
    `   优惠券 -${checkoutRes.data.couponDiscount / 100} 元，会员 -${
      checkoutRes.data.memberDiscount / 100
    } 元，积分 -${checkoutRes.data.pointsDiscount / 100} 元，实付 ${
      checkoutRes.data.total / 100
    } 元，获得 ${checkoutRes.data.earnedPoints} 积分${
      checkoutRes.data.giftDrink
        ? `，赠饮 ${checkoutRes.data.giftDrink.dishName}`
        : ""
    }`
  );

  console.log("6. 商户线下点餐与现金结账");
  cookie = await login("MERCHANT", "13800000001", "123456");
  const offlineRes = await api("/api/merchant/orders", {
    method: "POST",
    body: {
      tableId: tablesRes.data.tables.find((t) => t.name === "A03").id,
      items: [
        ...requiredDishes.map((dish) => ({ dishId: dish.id, quantity: 1 })),
        { dishId: optionalDishes[0].id, quantity: 1 }
      ],
      remark: "线下冒烟测试"
    }
  });
  assert(offlineRes.status === 200, `线下下单失败：${JSON.stringify(offlineRes.data)}`);
  const offlineSessionId = offlineRes.data.order.sessionId;
  const offlineCheckout = await api(
    `/api/merchant/session/${offlineSessionId}/checkout`,
    {
      method: "POST",
      body: { paymentMethod: "CASH" }
    }
  );
  assert(offlineCheckout.status === 200, "线下现金结账");
  const tableA03 = await api("/api/public/tables/demo-a03", { useCookie: false });
  assert(tableA03.data.table.status === "IDLE", "线下结账后桌台空闲");
  console.log("   线下点餐与现金结账正常，桌台已恢复空闲");

  console.log("\n全部冒烟测试通过 ✅");
}

main().catch((error) => {
  console.error("\n冒烟测试失败 ❌");
  console.error(error);
  process.exit(1);
});
