export const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: "待结账",
  PAID: "已结账",
  CANCELLED: "已取消"
};

export const ORDER_STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
  PAID: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CANCELLED: "bg-slate-100 text-slate-500 ring-slate-200"
};

export const TABLE_STATUS_LABEL: Record<string, string> = {
  IDLE: "空闲",
  OCCUPIED: "用餐中"
};

export const COUPON_TYPE_LABEL: Record<string, string> = {
  FULL_REDUCTION: "满减券",
  DISCOUNT: "折扣券"
};

export const PAYMENT_LABEL: Record<string, string> = {
  BALANCE: "余额支付",
  WECHAT: "微信支付",
  CASH: "现金/线下"
};

export const MERCHANT_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "正常",
  DISABLED: "停用"
};

export const POINT_TYPE_LABEL: Record<string, string> = {
  EARN: "消费获得",
  REDEEM: "积分抵扣",
  ADMIN: "管理员调整"
};

export const BALANCE_TYPE_LABEL: Record<string, string> = {
  RECHARGE: "充值",
  CONSUME: "消费",
  ADMIN: "管理员充值",
  REFUND: "退款",
  MEMBERSHIP: "会员费"
};

export const MEMBERSHIP_STATUS_LABEL: Record<string, string> = {
  TRIAL: "体验中",
  ACTIVE: "生效中",
  EXPIRED: "已到期"
};

export const MEMBERSHIP_STATUS_STYLE: Record<string, string> = {
  TRIAL: "bg-amber-50 text-amber-700 ring-amber-200",
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  EXPIRED: "bg-slate-100 text-slate-500 ring-slate-200"
};

export const BILLING_CYCLE_LABEL: Record<string, string> = {
  MONTHLY: "月付",
  YEARLY: "年付"
};

export const MEMBERSHIP_TX_TYPE_LABEL: Record<string, string> = {
  TRIAL: "首月 0 元体验",
  PURCHASE: "开通会员",
  RENEWAL: "自动续费"
};

export const USER_NAV = [
  { href: "/m", label: "点餐", icon: "Home" },
  { href: "/m/orders", label: "订单", icon: "ReceiptText" },
  { href: "/m/me", label: "我的", icon: "UserRound" }
] as const;

export const ADMIN_NAV = [
  { href: "/admin", label: "经营概览", icon: "LayoutDashboard" },
  { href: "/admin/merchants", label: "商户管理", icon: "Store" },
  { href: "/admin/users", label: "用户管理", icon: "Users" },
  { href: "/admin/coupons", label: "优惠券", icon: "TicketPercent" },
  { href: "/admin/activities", label: "活动管理", icon: "Megaphone" },
  { href: "/admin/memberships", label: "会员方案", icon: "Crown" },
  { href: "/admin/orders", label: "全平台订单", icon: "ReceiptText" },
  { href: "/admin/settings", label: "平台设置", icon: "Settings" }
] as const;

export const MERCHANT_NAV = [
  { href: "/merchant", label: "今日经营", icon: "LayoutDashboard" },
  { href: "/merchant/offline", label: "线下点餐", icon: "UtensilsCrossed" },
  { href: "/merchant/orders", label: "订单管理", icon: "ReceiptText" },
  { href: "/merchant/dishes", label: "菜品与库存", icon: "ChefHat" },
  { href: "/merchant/tables", label: "桌码管理", icon: "QrCode" },
  { href: "/merchant/coupons", label: "店铺优惠券", icon: "TicketPercent" },
  { href: "/merchant/settings", label: "店铺设置", icon: "Settings" }
] as const;
