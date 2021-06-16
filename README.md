# Apollo-docker

`携程Apollo`一键打包/部署方案。

几乎不需要修改任何Apollo源码或配置，实现快速开发/测试环境搭建。

基于`Apollo 1.6.1`

支持`Windows`，`Linux`

# 1、下载源码

## Apollo

```
git clone https://gitee.com/nobodyiam/apollo.git
```

## 编译脚本

```
git clone https://gitee.com/ellipse/apollo-docker.git
```

项目目录结构：

```
apollo-docker/
-- apollo/   <--预编译版
   -- admin/
   -- config/
   -- portal/
   -- apollo.env
   -- docker-compose.yml
-- build/    <--编译脚本
   -- gulpfile.js
   -- ...
```

# 2、环境准备

## JDK

必不可少

## Maven

Apollo项目使用`Maven`构建。如果没安装maven，会调用`apollo`项目根目录下的`mvnw`（会自动下载maven），但由于网络原因导致命令卡住。建议手动安装`maven`并配置环境变量，同时建议将仓库修改为国内仓库。

## Node.js

脚本使用`Gulp`编写，需要`Node.js`

## Docker

测试服务器需要安装`Docker`和`Docker compose`

# 3、兼容性检查

使用脚本打包前，先检查下maven版本兼容性。运行项目自带的编译脚本，如不报错则通过。

```
// 在项目根目录下运行
cd scripts
build.bat  或  ./build.sh
```

我的maven版本是3.6.3，在Windows中编译会报错：

```
[INFO] Apollo ConfigService ............................... FAILURE [  5.037 s]
[INFO] Apollo AdminService ................................ SKIPPED
[INFO] ------------------------------------------------------------------------
[INFO] BUILD FAILURE
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  49.311 s
[INFO] Finished at: 2020-05-23T11:08:01+08:00
[INFO] ------------------------------------------------------------------------
[ERROR] Failed to execute goal org.apache.maven.plugins:maven-assembly-plugin:2.6:single (default) on project apollo-configservice: Execution default of goal org.apache.maven.plugins:maven-assembly-plugin:2.6:single failed: An API incompatibility was encountered while executing org.apache.maven.plugins:maven-assembly-plugin:2.6:single: java.lang.ExceptionInInitializerError: null
.....
.....
[ERROR] Number of foreign imports: 1
[ERROR] import: Entry[import  from realm ClassRealm[maven.api, parent: null]]
[ERROR]
[ERROR] -----------------------------------------------------
[ERROR] : Index 1 out of bounds for length 1
```

异常信息很不直观，经过一番摸索是`maven-assembly-plugin`与maven版本不兼容导致的。

修改根目录下的`pom.xml`文件，将`maven-assembly-plugin`版本修改为3.3.0。

```xml
<!-- v1.6.1 494-498行 -->
<plugin>
	<groupId>org.apache.maven.plugins</groupId>
	<artifactId>maven-assembly-plugin</artifactId>
	<version>3.3.0</version>
</plugin>
```

修改完毕再次运行`build.bat`脚本，编译通过。

在CentOS_8测试环境未发现该问题。

# 4、编译

将本项目的build文件夹复制到apollo的根目录，目录结构为：

```
/
-- apollo-portal/
-- build/
   -- gulpfile.js
```

在build目录下打开控制台，执行下列操作

```bat
# ~/apollo/build/
# 需要安装 Node.js
npm i -g gulp     # 全局安装gulp
npm i             # 安装项目依赖
gulp              # 运行脚本
```

如果安装依赖过程中长时间卡住不动，就修改npm镜像为国内镜像

```bat
npm config set registry https://registry.npm.taobao.org
```

稍事等待后编译完成。如果编译过程中发生未知错误，请先按章节`3、兼容性检查`操作。

```
/
-- build/
   -- apollo/
      -- admin/
      -- config/
      -- portal/
      -- apollo.env           <- 通用环境变量
      -- docker-compose.yml   <- 运行脚本
   -- gulpfile.js
```

根据需要修改`apollo.env`和`docker-compose.yml`。

```properties
# apollo.env
DS_IP=192.168.0.109                    # 数据库所在主机的IP
DS_PORT=3306                           # 数据库端口
HOST_IP=192.168.0.103                  # Docker宿主机IP，只在环境变量中引用

DS_URL=jdbc:mysql://${DS_IP}:${DS_PORT}/${DB_NAME}?characterEncoding=utf8
DS_USERNAME=root                       # 数据库用户名
DS_PASSWORD=123456                     # 数据库密码
eureka.instance.ip-address=${HOST_IP}  # 向Eureka注册时所指定的IP，这里使用的是宿主机IP
```

```yml
# docker-compose.yml
version: '3'
services:
  apollo-config-01:
    container_name: apollo-configservice-01
    build: ./config
    ports:
      - 8080:8080
    volumes:
      - /data/apollo/config01:/opt/logs/100003171
    env_file:
      - apollo.env
    environment:
      - DB_NAME=ApolloConfigDB_Docker      # 数据库名
...
...
  apollo-portal-01:
    container_name: apollo-portalservice-01
    build: ./portal
    ports:
      - 8070:8070
    volumes:
      - /data/apollo/portal01:/opt/logs/100003173
    env_file:
      - apollo.env
    environment:
      - DB_NAME=ApolloPortalDB_Docker
      - LOCAL_META=http://192.168.0.103:8080   # Eureka的地址
      - DEV_META=http://192.168.0.103:8080     #
      - FAT_META=http://192.168.0.103:8080     #
      - UAT_META=http://192.168.0.103:8080     #
      - LPT_META=http://192.168.0.103:8080     #
      - PRO_META=http://192.168.0.103:8080     #
```

除此之外，其他的Spring配置都可以加到 environment 中从而覆盖Apollo的默认参数，例如

```properties
environment:
  - server.port=18080
```

# 5、单机部署

测试环境为：CentOS8 (Vmware) 并安装`Docker`和`Docker compose`

将新生成的apollo文件夹上传到服务器

```
/
-- build/
   -- apollo/      <-- 上传这个文件夹
   -- gulpfile.js
```

命令行进入apollo文件夹，运行

```sh
docker-compose up -d
```

检查是否启动成功

```sh
docker-compose ps
```

```
          Name                        Command               State           Ports
-----------------------------------------------------------------------------------------
apollo-adminservice-01    /apollo-adminservice/scrip ...   Up      0.0.0.0:8090->8090/tcp
apollo-configservice-01   /apollo-configservice/scri ...   Up      0.0.0.0:8080->8080/tcp
apollo-portalservice-01   /apollo-portal/scripts/sta ...   Up      0.0.0.0:8070->8070/tcp
```

> 注：`docker-compose`必须在包含`docker-compose.yml`文件的目录下才能执行。
>
> 若启动失败，在服务器/data/apollo/中查看日志。前面的配置中已将docker中的日志位置重定向到了宿主机。
>
> 如果是网络原因无法启动，参考这篇文章：https://my.oschina.net/u/580483/blog/4264763

由于服务注册和发现过程较慢，启动后需要等待约30秒（人肉计时）

浏览器中访问Eureka管理页面`http://192.168.0.103:8080/`，可以看到`APOLLO-ADMINSERVICE`和`APOLLO-CONFIGSERVICE`已经成功注册，并且ip地址也是正确的。

访问ApolloPortal管理页面`http://192.168.0.103:8070/`，管理员工具>系统信息，可以看到环境信息中已经成功获取了`APOLLO-ADMINSERVICE`和`APOLLO-CONFIGSERVICE`。

> 注：如果服务器开了防火墙，需要开放相应端口，并重启防火墙
>
> firewall-cmd --zone=public --add-port=8080/tcp --permanen

# 6、分布式部署

## 6.1 测试环境

```
测试机1：CentOS 8（Vmware） 192.168.0.103
---- ConfigService
---- AdminService
---- Portal

测试机2：CentOS 8（Vmware） 192.168.0.104
---- ConfigService
---- AdminService
```

## 6.2 修改配置

这里选择预编译版本进行部署。

### 数据库

```mysql
UPDATE serverconfig
SET `Value` = "http://192.168.0.103:8080/eureka/,http://192.168.0.104:8080/eureka/"
WHERE `Key` = "eureka.service.url"
```

### 测试机1

复制本项目根目录下的`apollo`文件夹，命名为`apollo_103。修改`apollo.env`，其他按实际环境修改。

```properties
HOST_IP=192.168.0.103
```

修改`docker-compose.yml`，其他按实际环境修改。

```yml
apollo-portal-01:
  ...
  environment:
    - DB_NAME=ApolloPortalDB_Docker
    - LOCAL_META=http://192.168.0.103:8080,http://192.168.0.104:8080
    - DEV_META=http://192.168.0.103:8080,http://192.168.0.104:8080
```

### 测试机2

复制`apollo_103`并重命名为`apollo_104`。修改`apollo.env`，其他按实际环境修改。

```properties
HOST_IP=192.168.0.104
```

修改`docker-compose.yml`，注释掉（或删除）`apollo-portal-01`部分。其他按实际环境修改。

```yml
#  apollo-portal-01:
#    container_name: apollo-portalservice-01
#    build: ./portal
#    ports:
#      - 8070:8070
#    volumes:
#      - /data/apollo/portal01:/opt/logs/100003173
#    env_file:
#      - apollo.env
#    environment:
#      - DB_NAME=ApolloPortalDB_Docker
#      - LOCAL_META=http://192.168.0.103:8080,http://192.168.0.104:8080
#      - DEV_META=http://192.168.0.103:8080,http://192.168.0.104:8080
#      - FAT_META=http://192.168.0.103:8080,http://192.168.0.104:8080
#      - UAT_META=http://192.168.0.103:8080,http://192.168.0.104:8080
#      - LPT_META=http://192.168.0.103:8080,http://192.168.0.104:8080
#      - PRO_META=http://192.168.0.103:8080,http://192.168.0.104:8080
```

## 6.3 启动Apollo

分别登录两台服务器，在`apollo_10X`目录下执行：

```shell
docker-compose up -d
```

