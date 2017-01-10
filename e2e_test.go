package main

import (
	"github.com/stretchr/testify/assert"
	"io/ioutil"
	"os"
	"os/exec"
	"testing"
)

func testPackage(name string, t *testing.T) {
	dir, err := ioutil.TempDir("", "TestE2E-"+name)
	assert.NoError(t, err)
	defer os.RemoveAll(dir)

	config := NewDefaultConfig()
	resolver := initResolver(config)
	store := initStore(dir, resolver)

	err = store.Install(nil, name, "*")
	assert.NoError(t, err)

	path, err := exec.LookPath("node")
	assert.NoError(t, err)

	cmd := exec.Command(path, "-e", `console.log(require("`+name+`"))`)
	cmd.Dir = dir

	out, err := cmd.CombinedOutput()
	assert.NoError(t, err, string(out))
}

// Each package installation should be reported individually.

func TestInstallLodash(t *testing.T)            { testPackage("lodash", t) }
func TestInstallRequest(t *testing.T)           { testPackage("request", t) }
func TestInstallAsync(t *testing.T)             { testPackage("async", t) }
func TestInstallUnderscore(t *testing.T)        { testPackage("underscore", t) }
func TestInstallExpress(t *testing.T)           { testPackage("express", t) }
func TestInstallBluebird(t *testing.T)          { testPackage("bluebird", t) }
func TestInstallChalk(t *testing.T)             { testPackage("chalk", t) }
func TestInstallCommander(t *testing.T)         { testPackage("commander", t) }
func TestInstallDebug(t *testing.T)             { testPackage("debug", t) }
func TestInstallMoment(t *testing.T)            { testPackage("moment", t) }
func TestInstallMkdirp(t *testing.T)            { testPackage("mkdirp", t) }
func TestInstallReact(t *testing.T)             { testPackage("react", t) }
func TestInstallColors(t *testing.T)            { testPackage("colors", t) }
func TestInstallQ(t *testing.T)                 { testPackage("q", t) }
func TestInstallThrough2(t *testing.T)          { testPackage("through2", t) }
func TestInstallYeomanGenerator(t *testing.T)   { testPackage("yeoman-generator", t) }
func TestInstallGlob(t *testing.T)              { testPackage("glob", t) }
func TestInstallMinimist(t *testing.T)          { testPackage("minimist", t) }
func TestInstallGulpUtil(t *testing.T)          { testPackage("gulp-util", t) }
func TestInstallBodyParser(t *testing.T)        { testPackage("body-parser", t) }
func TestInstallFsExtra(t *testing.T)           { testPackage("fs-extra", t) }
func TestInstallCoffeeScript(t *testing.T)      { testPackage("coffee-script", t) }
func TestInstallJquery(t *testing.T)            { testPackage("jquery", t) }
func TestInstallReactDom(t *testing.T)          { testPackage("react-dom", t) }
func TestInstallCheerio(t *testing.T)           { testPackage("cheerio", t) }
func TestInstallBabelRuntime(t *testing.T)      { testPackage("babel-runtime", t) }
func TestInstallYargs(t *testing.T)             { testPackage("yargs", t) }
func TestInstallNodeUuid(t *testing.T)          { testPackage("node-uuid", t) }
func TestInstallGulp(t *testing.T)              { testPackage("gulp", t) }
func TestInstallOptimist(t *testing.T)          { testPackage("optimist", t) }
func TestInstallWinston(t *testing.T)           { testPackage("winston", t) }
func TestInstallClassnames(t *testing.T)        { testPackage("classnames", t) }
func TestInstallYosay(t *testing.T)             { testPackage("yosay", t) }
func TestInstallObjectAssign(t *testing.T)      { testPackage("object-assign", t) }
func TestInstallSemver(t *testing.T)            { testPackage("semver", t) }
func TestInstallSocketIo(t *testing.T)          { testPackage("socket.io", t) }
func TestInstallRimraf(t *testing.T)            { testPackage("rimraf", t) }
func TestInstallRedis(t *testing.T)             { testPackage("redis", t) }
func TestInstallEmberCliBabel(t *testing.T)     { testPackage("ember-cli-babel", t) }
func TestInstallBabelPresetEs2015(t *testing.T) { testPackage("babel-preset-es2015", t) }
func TestInstallSuperagent(t *testing.T)        { testPackage("superagent", t) }
func TestInstallBabelCore(t *testing.T)         { testPackage("babel-core", t) }
func TestInstallHandlebars(t *testing.T)        { testPackage("handlebars", t) }
func TestInstallMongoose(t *testing.T)          { testPackage("mongoose", t) }
func TestInstallMongodb(t *testing.T)           { testPackage("mongodb", t) }
func TestInstallAwsSdk(t *testing.T)            { testPackage("aws-sdk", t) }
func TestInstallMocha(t *testing.T)             { testPackage("mocha", t) }
func TestInstallInquirer(t *testing.T)          { testPackage("inquirer", t) }
func TestInstallCo(t *testing.T)                { testPackage("co", t) }
func TestInstallJade(t *testing.T)              { testPackage("jade", t) }
func TestInstallShelljs(t *testing.T)           { testPackage("shelljs", t) }
func TestInstallExtend(t *testing.T)            { testPackage("extend", t) }
func TestInstallUuid(t *testing.T)              { testPackage("uuid", t) }
func TestInstallXml2js(t *testing.T)            { testPackage("xml2js", t) }
func TestInstallJsYaml(t *testing.T)            { testPackage("js-yaml", t) }
func TestInstallEjs(t *testing.T)               { testPackage("ejs", t) }
func TestInstallUglifyJs(t *testing.T)          { testPackage("uglify-js", t) }
func TestInstallMime(t *testing.T)              { testPackage("mime", t) }
func TestInstallChai(t *testing.T)              { testPackage("chai", t) }
func TestInstallWebpack(t *testing.T)           { testPackage("webpack", t) }
func TestInstallUnderscoreString(t *testing.T)  { testPackage("underscore.string", t) }
func TestInstallMorgan(t *testing.T)            { testPackage("morgan", t) }
func TestInstallJoi(t *testing.T)               { testPackage("joi", t) }
func TestInstallMarked(t *testing.T)            { testPackage("marked", t) }
func TestInstallCookieParser(t *testing.T)      { testPackage("cookie-parser", t) }
func TestInstallBrowserify(t *testing.T)        { testPackage("browserify", t) }
func TestInstallXtend(t *testing.T)             { testPackage("xtend", t) }
func TestInstallEs6Promise(t *testing.T)        { testPackage("es6-promise", t) }
func TestInstallGrunt(t *testing.T)             { testPackage("grunt", t) }
func TestInstallBabelPolyfill(t *testing.T)     { testPackage("babel-polyfill", t) }
func TestInstallPromise(t *testing.T)           { testPackage("promise", t) }
func TestInstallMysql(t *testing.T)             { testPackage("mysql", t) }
func TestInstallWs(t *testing.T)                { testPackage("ws", t) }
func TestInstallRedux(t *testing.T)             { testPackage("redux", t) }
func TestInstallThrough(t *testing.T)           { testPackage("through", t) }
func TestInstallPath(t *testing.T)              { testPackage("path", t) }
func TestInstallImmutable(t *testing.T)         { testPackage("immutable", t) }
func TestInstallRamda(t *testing.T)             { testPackage("ramda", t) }
func TestInstallNan(t *testing.T)               { testPackage("nan", t) }
func TestInstallRequestPromise(t *testing.T)    { testPackage("request-promise", t) }
func TestInstallPrompt(t *testing.T)            { testPackage("prompt", t) }
func TestInstallRxjs(t *testing.T)              { testPackage("rxjs", t) }
func TestInstallAngular(t *testing.T)           { testPackage("angular", t) }
func TestInstallMinimatch(t *testing.T)         { testPackage("minimatch", t) }
func TestInstallBunyan(t *testing.T)            { testPackage("bunyan", t) }
func TestInstallLess(t *testing.T)              { testPackage("less", t) }
func TestInstallBabelLoader(t *testing.T)       { testPackage("babel-loader", t) }
func TestInstallGulpRename(t *testing.T)        { testPackage("gulp-rename", t) }
func TestInstallConnect(t *testing.T)           { testPackage("connect", t) }
func TestInstallPostcss(t *testing.T)           { testPackage("postcss", t) }
func TestInstallEslint(t *testing.T)            { testPackage("eslint", t) }
func TestInstallMeow(t *testing.T)              { testPackage("meow", t) }
func TestInstallQs(t *testing.T)                { testPackage("qs", t) }
func TestInstallChokidar(t *testing.T)          { testPackage("chokidar", t) }
func TestInstallBabelPresetReact(t *testing.T)  { testPackage("babel-preset-react", t) }
func TestInstallReactRedux(t *testing.T)        { testPackage("react-redux", t) }
func TestInstallInherits(t *testing.T)          { testPackage("inherits", t) }
func TestInstallPassport(t *testing.T)          { testPackage("passport", t) }
func TestInstallSocketIoClient(t *testing.T)    { testPackage("socket.io-client", t) }
func TestInstallReactRouter(t *testing.T)       { testPackage("react-router", t) }
