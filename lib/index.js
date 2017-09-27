/*
 * @Author: lkspc 
 * @Date: 2017-09-27 16:19:34 
 * @Last Modified by: lkspc
 * @Last Modified time: 2017-09-28 00:46:48
 */

'use strict';

const SequelizeAuto = require('./sequelize-auto');
const async = require('async');
const _ = require('lodash');
const SqlString = require('./sequelize-auto/sql-string');

class EggSequelizeAuto extends SequelizeAuto {

  run(callback) {
    var self = this;
    var text = {};
    var tables = [];

    this.build(generateText);

    function generateText(err) {
      var quoteWrapper = '"';
      if (err) console.error(err)

      async.each(_.keys(self.tables), function(table, _callback) {
        var fields = _.keys(self.tables[table]),
          spaces = '';

        for (var x = 0; x < self.options.indentation; ++x) {
          spaces += (self.options.spaces === true ? ' ' : "\t");
        }

        text[table] = "/* indent size: " + self.options.indentation + " */\n\n";
        text[table] += "module.exports = app => {\n";
        text[table] += spaces + "const DataTypes = app.Sequelize;\n\n";
        var tableName = self.options.camelCase ? _.camelCase(table) : table;
        text[table] += spaces + "const Model = app.model.define('" + tableName + "', {\n";

        _.each(fields, function(field, i) {
          var additional = self.options.additional
          if (additional && additional.timestamps !== undefined && additional.timestamps) {
            if ((additional.createdAt && field === 'createdAt' || additional.createdAt === field) ||
              (additional.updatedAt && field === 'updatedAt' || additional.updatedAt === field) ||
              (additional.deletedAt && field === 'deletedAt' || additional.deletedAt === field)) {
              return true
            }
          }
          // Find foreign key
          var foreignKey = self.foreignKeys[table] && self.foreignKeys[table][field] ? self.foreignKeys[table][field] : null

          if (_.isObject(foreignKey)) {
            self.tables[table][field].foreignKey = foreignKey
          }

          // column's attributes
          var fieldAttr = _.keys(self.tables[table][field]);
          var fieldName = self.options.camelCase ? _.camelCase(field) : field;
          text[table] += spaces + spaces + fieldName + ": {\n";

          // Serial key for postgres...
          var defaultVal = self.tables[table][field].defaultValue;

          // ENUMs for postgres...
          if (self.tables[table][field].type === "USER-DEFINED" && !!self.tables[table][field].special) {
            self.tables[table][field].type = "ENUM(" + self.tables[table][field].special.map(function(f) { return quoteWrapper + f + quoteWrapper; }).join(',') + ")";
          }

          var isUnique = self.tables[table][field].foreignKey && self.tables[table][field].foreignKey.isUnique

          _.each(fieldAttr, function(attr, x) {
            var isSerialKey = self.tables[table][field].foreignKey && _.isFunction(self.dialect.isSerialKey) && self.dialect.isSerialKey(self.tables[table][field].foreignKey)

            // We don't need the special attribute from postgresql describe table..
            if (attr === "special") {
              return true;
            }

            if (attr === "foreignKey") {
              if (isSerialKey) {
                text[table] += spaces + spaces + spaces + "autoIncrement: true";
              } else if (foreignKey.isForeignKey) {
                text[table] += spaces + spaces + spaces + "references: {\n";
                text[table] += spaces + spaces + spaces + spaces + "model: \'" + self.tables[table][field][attr].foreignSources.target_table + "\',\n"
                text[table] += spaces + spaces + spaces + spaces + "key: \'" + self.tables[table][field][attr].foreignSources.target_column + "\'\n"
                text[table] += spaces + spaces + spaces + "}"
              } else return true
            } else if (attr === "primaryKey") {
              if (self.tables[table][field][attr] === true && (!_.has(self.tables[table][field], 'foreignKey') || (_.has(self.tables[table][field], 'foreignKey') && !!self.tables[table][field].foreignKey.isPrimaryKey)))
                text[table] += spaces + spaces + spaces + "primaryKey: true";
              else return true
            } else if (attr === "allowNull") {
              text[table] += spaces + spaces + spaces + attr + ": " + self.tables[table][field][attr];
            } else if (attr === "defaultValue") {
              if (self.sequelize.options.dialect === "mssql" && defaultVal && defaultVal.toLowerCase() === '(newid())') {
                defaultVal = null; // disable adding "default value" attribute for UUID fields if generating for MS SQL
              }

              var val_text = defaultVal;

              if (isSerialKey) return true

              //mySql Bit fix
              if (self.tables[table][field].type.toLowerCase() === 'bit(1)') {
                val_text = defaultVal === "b'1'" ? 1 : 0;
              }
              // mssql bit fix
              else if (self.sequelize.options.dialect === "mssql" && self.tables[table][field].type.toLowerCase() === "bit") {
                val_text = defaultVal === "((1))" ? 1 : 0;
              }

              if (_.isString(defaultVal)) {
                var field_type = self.tables[table][field].type.toLowerCase();
                if (field_type.indexOf('date') === 0 || field_type.indexOf('timestamp') === 0) {
                  if (_.endsWith(defaultVal, '()')) {
                    val_text = "sequelize.fn('" + defaultVal.replace(/\(\)$/, '') + "')"
                  } else if (_.includes(['current_timestamp', 'current_date', 'current_time', 'localtime', 'localtimestamp'], defaultVal.toLowerCase())) {
                    val_text = "sequelize.literal('" + defaultVal + "')"
                  } else {
                    val_text = quoteWrapper + val_text + quoteWrapper
                  }
                } else {
                  val_text = quoteWrapper + val_text + quoteWrapper
                }
              }

              if (defaultVal === null || defaultVal === undefined) {
                return true;
              } else {
                val_text = _.isString(val_text) && !val_text.match(/^sequelize\.[^(]+\(.*\)$/) ? SqlString.escape(_.trim(val_text, '"'), null, self.options.dialect) : val_text;

                // don't prepend N for MSSQL when building models...
                val_text = _.trimStart(val_text, 'N')
                text[table] += spaces + spaces + spaces + attr + ": " + val_text;
              }
            } else if (attr === "type" && self.tables[table][field][attr].indexOf('ENUM') === 0) {
              text[table] += spaces + spaces + spaces + attr + ": DataTypes." + self.tables[table][field][attr];
            } else {
              var _attr = (self.tables[table][field][attr] || '').toLowerCase();
              var val = quoteWrapper + self.tables[table][field][attr] + quoteWrapper;

              if (_attr === "boolean" || _attr === "bit(1)" || _attr === "bit") {
                val = 'DataTypes.BOOLEAN';
              } else if (_attr.match(/^(smallint|mediumint|tinyint|int)/)) {
                var length = _attr.match(/\(\d+\)/);
                val = 'DataTypes.INTEGER' + (!_.isNull(length) ? length : '');

                var unsigned = _attr.match(/unsigned/i);
                if (unsigned) val += '.UNSIGNED'

                var zero = _attr.match(/zerofill/i);
                if (zero) val += '.ZEROFILL'
              } else if (_attr.match(/^bigint/)) {
                val = 'DataTypes.BIGINT';
              } else if (_attr.match(/^varchar/)) {
                var length = _attr.match(/\(\d+\)/);
                val = 'DataTypes.STRING' + (!_.isNull(length) ? length : '');
              } else if (_attr.match(/^string|varying|nvarchar/)) {
                val = 'DataTypes.STRING';
              } else if (_attr.match(/^char/)) {
                var length = _attr.match(/\(\d+\)/);
                val = 'DataTypes.CHAR' + (!_.isNull(length) ? length : '');
              } else if (_attr.match(/^real/)) {
                val = 'DataTypes.REAL';
              } else if (_attr.match(/text|ntext$/)) {
                val = 'DataTypes.TEXT';
              } else if (_attr.match(/^(date)/)) {
                val = 'DataTypes.DATE';
              } else if (_attr.match(/^(time)/)) {
                val = 'DataTypes.TIME';
              } else if (_attr.match(/^(float|float4)/)) {
                val = 'DataTypes.FLOAT';
              } else if (_attr.match(/^decimal/)) {
                val = 'DataTypes.DECIMAL';
              } else if (_attr.match(/^(float8|double precision|numeric)/)) {
                val = 'DataTypes.DOUBLE';
              } else if (_attr.match(/^uuid|uniqueidentifier/)) {
                val = 'DataTypes.UUIDV4';
              } else if (_attr.match(/^json/)) {
                val = 'DataTypes.JSON';
              } else if (_attr.match(/^jsonb/)) {
                val = 'DataTypes.JSONB';
              } else if (_attr.match(/^geometry/)) {
                val = 'DataTypes.GEOMETRY';
              }
              text[table] += spaces + spaces + spaces + attr + ": " + val;
            }

            text[table] += ",";
            text[table] += "\n";
          });

          if (isUnique) {
            text[table] += spaces + spaces + spaces + "unique: true,\n";
          }

          if (self.options.camelCase) {
            text[table] += spaces + spaces + spaces + "field: '" + field + "',\n";
          }

          // removes the last `,` within the attribute options
          text[table] = text[table].trim().replace(/,+$/, '') + "\n";

          text[table] += spaces + spaces + "}";
          if ((i + 1) < fields.length) {
            text[table] += ",";
          }
          text[table] += "\n";
        });

        text[table] += spaces + "}";

        //conditionally add additional options to tag on to orm objects
        var hasadditional = _.isObject(self.options.additional) && _.keys(self.options.additional).length > 0;

        text[table] += ", {\n";

        text[table] += spaces + spaces + "tableName: '" + table + "',\n";

        if (hasadditional) {
          _.each(self.options.additional, addAdditionalOption)
        }

        text[table] = text[table].trim()
        text[table] = text[table].substring(0, text[table].length - 1);
        text[table] += "\n" + spaces + "}";

        function addAdditionalOption(value, key) {
          if (key === 'name') {
            // name: true - preserve table name always
            text[table] += spaces + spaces + "name: {\n";
            text[table] += spaces + spaces + spaces + "singular: '" + table + "',\n";
            text[table] += spaces + spaces + spaces + "plural: '" + table + "'\n";
            text[table] += spaces + spaces + "},\n";
          } else {
            value = _.isBoolean(value) ? value : ("'" + value + "'")
            text[table] += spaces + spaces + key + ": " + value + ",\n";
          }
        }

        //resume normal output
        text[table] += ");\n\n";
        // associate 
        text[table] += spaces + "Model.associate = function() {\n\n" + spaces + "}\n\n";
        text[table] += spaces + "return Model;\n";
        //resume normal output
        text[table] += "};\n";
        _callback(null);
      }, function() {
        self.sequelize.close();

        if (self.options.directory) {
          return self.write(text, callback);
        }
        return callback(false, text);
      });
    }
  }
}

module.exports = EggSequelizeAuto;