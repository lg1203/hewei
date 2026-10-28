const app = getApp();

Page({
  data: {
    url: ""
  },

  onLoad(query) {
    const base = (app.globalData.baseUrl || "").replace(/\/$/, "");
    // 支持扫码进入：/pages/index/index?token=demo-a01
    // 也支持小程序码 scene 参数：scene=demo-a01
    const token = query.token || query.scene || "";
    this.setData({
      url: token
        ? `${base}/m/scan?token=${encodeURIComponent(token)}`
        : `${base}/m`
    });
  },

  onMessage(event) {
    // web-view 内页面可通过 wx.miniProgram.postMessage 回传消息
    console.log("web-view message", event.detail);
  }
});
