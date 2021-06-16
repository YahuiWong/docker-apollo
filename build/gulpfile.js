const {src, dest, series, parallel} = require('gulp');
const {exec, execSync} = require('child_process')
const {promisify} = require('util')

const finished = promisify(require('stream').finished)
const path = require('path')
const clean = require('gulp-clean')
const colors = require('colors/safe')
const split = require('split2')
const iconv = require('iconv-lite');
const isWindows = require('is-windows');

const MVN = /*'mvn'*/ mvnCmd()

const ENCODING = isWindows() ? 'cp936' : 'utf8'
const projectDir = path.resolve(__dirname, '..')
const distDir = path.resolve(__dirname, 'apollo')

function cleanProject() {
  const cmd = `${MVN} clean`
  console.log(colors.yellow('EXEC'), cmd)
  const cp = exec(cmd, {cwd: projectDir, encoding: 'buffer'})
  return sout(cp)
}

function cleanDist() {
  return src(distDir, {read: false, allowEmpty: true}).pipe(clean())
}

exports.cleanProject = cleanProject
exports.cleanDist = cleanDist
exports.clean = parallel(cleanProject, cleanDist)

function packageService() {
  console.log(colors.yellow('==== starting to build config-service and admin-service ===='))
  const cmd = `${MVN} clean package -DskipTests -pl apollo-configservice,apollo-adminservice -am -Dapollo_profile=github`
  console.log(colors.yellow('EXEC'), cmd)
  const cp = exec(cmd, {cwd: projectDir, encoding: 'buffer'})
  return sout(cp)
}

function packagePortal() {
  console.log(colors.yellow('==== starting to build portal ===='))
  const cmd = `${MVN} clean package -DskipTests -pl apollo-portal -am -Dapollo_profile=github,auth`
  console.log(colors.yellow('EXEC'), cmd)
  const cp = exec(cmd, {cwd: projectDir, encoding: 'buffer'})
  return sout(cp)
}

exports.packageService = packageService
exports.packagePortal = packagePortal
exports.build = series(packageService, packagePortal)

exports.copy = function copy() {
  return Promise.all([
    finished(src(`docker-compose.yml`).pipe(dest(distDir))),
    finished(src('apollo.env').pipe(dest(distDir))),
    finished(
      src(`${projectDir}/apollo-configservice/src/main/docker/Dockerfile`).pipe(dest(`${distDir}/config`))
    ),
    finished(
      src(`${projectDir}/apollo-configservice/target/*-github.zip`).pipe(dest(`${distDir}/config`))
    ),
    finished(
      src(`${projectDir}/apollo-adminservice/src/main/docker/Dockerfile`).pipe(dest(`${distDir}/admin`))
    ),
    finished(
      src(`${projectDir}/apollo-adminservice/target/*-github.zip`).pipe(dest(`${distDir}/admin`))
    ),
    finished(
      src(`${projectDir}/apollo-portal/src/main/docker/Dockerfile`).pipe(dest(`${distDir}/portal`))
    ),
    finished(
      src(`${projectDir}/apollo-portal/target/*-github.zip`).pipe(dest(`${distDir}/portal`))
    )
  ])
}

exports.default = series(exports.clean, exports.build, exports.copy)

function sout(child) {
  child.stdout
    .pipe(iconv.decodeStream(ENCODING))
    .pipe(split()).on('data', (line) => {
    console.log(line)
  })
  /*child.stdout.on('close', () => {
    console.log(colors.green('stdout close'))
  })
  child.stdout.on('end', () => {
    console.log(colors.green('stdout end'))
  })
  child.stdout.on('pause', () => {
    console.log(colors.green('stdout pause'))
  })*/

  child.stderr
    .pipe(iconv.decodeStream(ENCODING))
    .pipe(split()).on('data', (line) => {
    console.error(colors.red(line))
  })
  /*child.stderr.on('close', () => {
    console.log(colors.gray('stderr close'))
  })
  child.stderr.on('end', () => {
    console.log(colors.gray('stderr end'))
  })
  child.stderr.on('pause', () => {
    console.log(colors.gray('stderr pause'))
  })*/


  child.on('error', () => {
    console.log(colors.red.underline('error'))
  })
  child.on('message', () => {
    console.log(colors.inverse('message'))
  })
  /*child.on('close', (code) => {
    console.log(colors.yellow('close'), code)
  })
  child.on('disconnect', () => {
    console.log(colors.yellow('disconnect'))
  })
  child.on('exit', () => {
    console.log(colors.yellow('exit'))
  })*/
  return child
}

function mvnCmd() {
  let pre = ''
  let mvn = 'mvn'
  try {
    execSync(`${mvn} -v`, {encoding: 'utf8', stdio: 'ignore'})
    console.info(colors.green('`mvn` found'))
  } catch (e) {
    console.warn(colors.yellow('`mvn` not found, use `mvnw` instead'))
    mvn = 'mvnw'
    if (!isWindows()) {
      pre = "sh "
    }
  }
  return `${pre}${mvn}`
}
