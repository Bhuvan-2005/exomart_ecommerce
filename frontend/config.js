(function configureExomart(global) {
  const CONFIG = global.EXOMART_CONFIG || {};

  CONFIG.API_ENDPOINT = CONFIG.API_ENDPOINT || 'https://pzhzdsqarb.execute-api.us-east-1.amazonaws.com/prod';

  global.EXOMART_CONFIG = CONFIG;
})(window);

