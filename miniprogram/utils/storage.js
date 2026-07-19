function get(key, fallbackValue) {
  try {
    const value = wx.getStorageSync(key);
    return value === '' || value === undefined ? fallbackValue : value;
  } catch (error) {
    return fallbackValue;
  }
}

function set(key, value) {
  wx.setStorageSync(key, value);
  return value;
}

function remove(key) {
  wx.removeStorageSync(key);
}

module.exports = {
  get,
  set,
  remove
};
