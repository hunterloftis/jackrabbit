module.exports = {
  extends: 'hapi',
  parserOptions: {
    ecmaVersion: 9
  },
  rules: {
    "no-console": 2
  },
  globals: {
    describe: true,
    it: true,
    beforeEach: true,
    afterEach: true
  }
}
