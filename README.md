# Egg-Sequelize-Auto

Automatically generate models for [egg-sequelize](https://github.com/eggjs/egg-sequelize) via the command line.

NOTE: Egg-Sequelize-Auto is based on [Sequelize-Auto](https://github.com/sequelize/sequelize-auto).

## Why Egg-Sequelize-Auto

[Sequelize-Auto](https://github.com/sequelize/sequelize-auto)
is a tool used to generate models for [Sequelize](https://github.com/sequelize/sequelize), which based on old `Sequelize` version 3.x.

Now, `Sequelize v4` has breaking changes, we need a latest version of `Sequelize-Auto` which works in [Egg](https://github.com/eggjs/egg).

So we upgraded `Sequelize-Auto` to `Sequelize` v4 and adjusted it for [egg-sequelize](https://github.com/eggjs/egg-sequelize).

## Install

    npm install -g egg-sequelize-auto

## Prerequisites

You will need to install the correct dialect binding globally before using egg-sequelize-auto.

Example for MySQL/MariaDB

`npm install -g mysql2`

Example for Postgres

`npm install -g pg pg-hstore`

Example for Sqlite3

`npm install -g sqlite3`

Example for MSSQL

`npm install -g mssql`

## Usage

When installed `egg-sequelize-auto`, you could use both `egg-sequelize-auto` and `sequlize-auto`.

Usages are all the same, see [sequelize-auto's usage](https://github.com/sequelize/sequelize-auto#usage)

## Example

    egg-sequelize-auto -o "./models" -d test -h localhost -u root -p root -x my_password -e mysql

Produces a file/files such as ./app/model/users.js which looks like:

    /* indent size: 2 */

    module.exports = app => {
      const DataTypes = app.Sequelize;

      const Model = app.model.define('Users', {
        id: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        username: {
          type: DataTypes.STRING,
          allowNull: true
        },
        touchedAt: {
          type: DataTypes.DATE,
          allowNull: true
        },
        aNumber: {
          type: DataTypes.INTEGER(11),
          allowNull: true
        },
        bNumber: {
          type: DataTypes.INTEGER(11),
          allowNull: true
        },
        validateTest: {
          type: DataTypes.INTEGER(11),
          allowNull: true
        },
        validateCustom: {
          type: DataTypes.STRING,
          allowNull: false
        },
        dateAllowNullTrue: {
          type: DataTypes.DATE,
          allowNull: true
        },
        defaultValueBoolean: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: '1'
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false
        }
      }, {
        tableName: 'Users',
        freezeTableName: true
      });

      Model.associate = function (){

      }

      return Model;
    };


## Configuration options

For the `-c, --config` option the following JSON/configuration parameters are defined by Sequelize's `options` flag within the constructor. For more info:

[http://docs.sequelizejs.com/class/lib/sequelize.js~Sequelize.html#instance-constructor-constructor](http://docs.sequelizejs.com/class/lib/sequelize.js~Sequelize.html#instance-constructor-constructor)

## Programmatic API

```js
const EggSequelizeAuto = require('egg-sequelize-auto')
const auto = new EggSequelizeAuto'database', 'user', 'pass');

// start 
auto.run(function (err) {
  if (err) throw err;

  console.log(auto.tables); // table list
  console.log(auto.foreignKeys); // foreign key list
});

// With options:
const auto = new EggSequelizeAuto('database', 'user', 'pass', {
    host: 'localhost',
    dialect: 'mysql'|'mariadb'|'sqlite'|'postgres'|'mssql',
    directory: false, // prevents the program from writing to disk
    port: 'port',
    additional: {
        timestamps: false
        //...
    },
    tables: ['table1', 'table2', 'table3']
    //...
})
```