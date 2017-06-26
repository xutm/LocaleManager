# locale 

#Technologies
	Mysql
	Is a relational database management system (RDBMS) in July 2013, it was the world's second most widely used RDBMS, and the most widely used open-source RDBMS.

	Express
	The best way to understand express is through its Official Website, particularly The Express Guide; you can also go through this StackOverflow thread for more resources.

	AngularJS
	Angular's Official Website is a great starting point. CodeSchool and google created a great tutorial for beginners, and the angular videos by Egghead. Utilice Angular Style Guide and best practice make by Jhon Papa

	Node.js
	Start by going through Node.js Official Website and this StackOverflow thread, which should get you going with the Node.js platform in no time.

	JQuery
	jQuery is a fast, small, and feature-rich JavaScript library.


#Additional Tools
	node-mysql
	This is a node.js driver for mysql. It is written in JavaScript, does not require compiling, and is 100% MIT licensed.

	Twitter Bootstrap
	The most popular HTML, CSS, and JS framework for developing responsive, mobile first projects.

#Prerequisites
	Node.js - latest https://nodejs.org 

	MySQL - Download and Install MySQL - Make sure it's running on the default port (3306).


#How to setup MySQL
	http://jingyan.baidu.com/article/597035521d5de28fc00740e6.html

#How to setup nodejs
	http://jingyan.baidu.com/article/b0b63dbfca599a4a483070a5.html

#How to use Ucloud_OperateJSON 
	1,git clone https://github.com/xutm/Ucloud_OperateJSON.git

	2,cd Ucloud_OperateJSON

	3,npm install

	4,gulp

	5,input localhost:4041 in explorer

	note:1.The OutputJson button: be used to export the data of MySQL to the en_US.json and zh_CN.json
	         2.The LoadData button: be used to import the data of MySQL to client.

#MySQL
	1,CREATE DATABASE uweb;
	2,SHOW DATABASES;
	3,use uweb
	4,CREATE TABLE locale(
	    id int auto_increment PRIMARY KEY,
		Name varchar(50) NOT NULL,
		CN TEXT,
		EN TEXT,
		Field varchar(200)
	) ENGINE=InnoDB  DEFAULT CHARSET=utf8 ;
	CREATE TABLE locale_version(id int auto_increment PRIMARY KEY, Product varchar(50), Company varchar(50), Version varchar(200), CreateTime int, GreyId varchar(200), IsValid BOOL) ENGINE=InnoDB DEFAULT CHARSET=utf8;
select exists(select * from users where user='admin' and password='admin');
insert into users set user='',password='';
	note: Base function to operate MySQL
		(1)show databases;
		(2)create database <database name>;
		(3)use <database name>
		(4)show tables;
		(5)select * from <table>;
		(6)mysql -uroot -p
	http://www.sitepoint.com/using-node-mysql-javascript-client/
	http://database.51cto.com/art/201005/201989.htm

#Get New Technology&Knowledge In This Program
	1,AngularJS $http service and jQuery.ajax()
	http://victorblog.com/2012/12/20/make-angularjs-http-service-behave-like-jquery-ajax/

	2,Understand Jade
	http://segmentfault.com/a/1190000000357534
	http://briantford.com/blog/angular-express

	3,Angular communicates with Nodejs
	https://scotch.io/tutorials/creating-a-single-page-todo-app-with-node-and-angular

	4,How to use Express
	http://expressjs.com/en/guide/routing.html

	5,Understand sequelize
	https://cnodejs.org/topic/5201c94144e76d216a39c4dc

	6,How to use /felixge/node-mysql
	https://github.com/felixge/node-mysql#timeouts

	7,How to use MySQL with Nodejs and node-mysql
	http://www.sitepoint.com/using-node-mysql-javascript-client/

	8.Understand Nginx
	http://mayank-grover.me/setup-nginx-php-mysql-on-windows-in-2-minutes/
	http://nginx.org/en/
