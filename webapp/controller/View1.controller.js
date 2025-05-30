sap.ui.define([
    "./CC/Base/BaseController",
    "aspn/demo/demo0010/controller/CC/Control/xml/Switch",
    "aspn/demo/demo0010/controller/CC/Control/xml/Case",
    "aspn/demo/demo0010/controller/CC/Control/xml/Default",

], function (BaseController,
    Switch,
    Case,
    Default) {
    "use strict";

    return BaseController.extend("aspn.demo.demo0010.controller.View1", {
        /**
         * @override
         */
        _registerModel() {
            BaseController.prototype._registerModel.apply(this, arguments);
            this.setmodel("tableData")

        },
        onAfterRendering: async function () {
            const Username = "ZASGR";
            const Password = "NVAicKrdiijdaUXrFPg3(kzuiaVpEqXDbBytXiWt";
            const req = await fetch("/sap/bc/http/sap/zasgr_http_api?IF_NAME=8000&IF_MODE=POST", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Basic " + btoa(`${Username}:${Password}`)
                },
                body: JSON.stringify({
                    "form_id": "ASPN01",
                    "menu_id": "MENU101"
                })

            });

            let data;
            if (req.ok) {
                data = await req.json();
            } else {
                console.error("Error:", req.status, req.statusText);
                return;
            }

            if (data.RE_CODE !== "S") {
                return await this.MessageBox().error("Get data error")
            }

            const aColumns = [];
            const aRows = [];
            data.TO_STR.forEach(element => {
                if (element.RC_GUBUN === "R") {
                    aRows.push(element);
                } else if (element.RC_GUBUN === "C") {
                    aColumns.push(element);
                }
            });

            this._mergeData = data.TO_FORMULAR;

            aColumns.sort((a, b) => {
                const numA = parseInt(a.RC_ID.substring(1), 10);
                const numB = parseInt(b.RC_ID.substring(1), 10);
                return numA - numB;
            });

            aRows.sort((a, b) => {
                const numA = parseInt(a.RC_ID.substring(1), 10);
                const numB = parseInt(b.RC_ID.substring(1), 10);
                return numA - numB;
            });

            const oTable = this.byId("idTable")
            aColumns.forEach(cloumn => {
                oTable.addColumn(new sap.ui.table.Column({
                    label: new sap.m.Label({ text: cloumn.TEXT }),
                    customData: [new sap.ui.core.CustomData({
                        key: "minWidth",
                        value: "180px"
                    })],
                    template: new Switch({
                        value: `{tableData>${cloumn.RC_ID}/sum}`,
                        content: [
                            new Case({
                                value: false,
                                content: new sap.m.Input({
                                    value: `{tableData>${cloumn.RC_ID}/value}`,
                                    liveChange: this._changeInput.bind(this),
                                    type: sap.m.InputType.Number
                                })
                            }),
                            new Default({
                                content: new sap.m.Text({
                                    text: `{tableData>${cloumn.RC_ID}/value}`
                                })
                            })
                        ]
                    })
                }))
            })

            const isSumCell = (cloumn, row) => {
                return data.TO_FORMULAR.some(item => {
                    return item.COL_ID === cloumn && item.ROW_ID === row;
                })
            }

            this.setmodeldata("tableData", aRows.map(row => {
                let oRow = {};
                aColumns.forEach(c => {
                    if (c.RC_ID === "C000") {
                        oRow[c.RC_ID] = { value: row.TEXT, sum: true };
                    } else {
                        oRow[c.RC_ID] = { sum: isSumCell(c.RC_ID, row.RC_ID) }
                    }
                })
                return oRow
            }))

            setTimeout(() => {
                this.__autoWidthTable(oTable)
            }, 0)
        },

        _changeInput(oEvent, oData) {

            const getRow = (sPath) => {
                const index = sPath.substring(sPath.lastIndexOf("/") + 1);
                const rowIndex = Number(index) + 1;
                return "R" + rowIndex.toString().padStart(3, '0');
            }

            const getPath = (sRow) => {
                return "/" + (parseInt(sRow.substring(1), 10) - 1);
            }

            const parseFormulaWithOperatorsAndTypes = function (formula) {
                // 如果以字母开头没有操作符，补上默认的 '+'
                if (!/^[-+]/.test(formula)) {
                    formula = "+" + formula;
                }

                // 正则表达式：匹配 (+|-)(C|R)\d{3}
                const regex = /([+-])([CR]\d{3})/g;
                const result = [];
                let match;

                while ((match = regex.exec(formula)) !== null) {
                    result.push({
                        operator: match[1],
                        operand: match[2]
                    });
                }

                return result;
            }

            let newValue, oInput, sColumn, sPath, sRow;
            if (oData) {
                newValue = oData.newValue;
                sColumn = oData.column;
                sRow = oData.row
            } else {
                newValue = oEvent.getParameter("newValue");
                oInput = oEvent.getSource();
                sColumn = oInput.getBindingInfo("value").binding.sPath.split('/')[0];
                sPath = oInput.getBindingInfo("value").binding.oContext.sPath
                sRow = getRow(sPath)
            }

            const changeCell = [];
            this._mergeData.forEach(element => {
                if (element.FORMULAT_LEVEL === "COL") {
                    if (element.ROW_ID === sRow && element.FORMULAR.includes(sColumn)) {
                        changeCell.push(element);
                    }
                } else if (element.FORMULAT_LEVEL === "ROW") {
                    if (element.COL_ID === sColumn && element.FORMULAR.includes(sRow)) {
                        changeCell.push(element);
                    }
                }
            });

            changeCell.forEach(cell => {
                if (cell.FORMULAT_LEVEL === "COL") {
                    const sPath = getPath(cell.ROW_ID)
                    const aColumns = parseFormulaWithOperatorsAndTypes(cell.FORMULAR)
                    const aValues = aColumns.map(column => {
                        if (column.operand === sColumn && cell.ROW_ID === sRow) {
                            return newValue;
                        } else {
                            const data = this.getmodelproperty("tableData", sPath + "/" + column.operand + "/value")
                            return data === undefined ? 0 : data;
                        }
                    });
                    let sum = 0;
                    aValues.forEach((value, index) => {
                        if (aColumns[index].operator === "+") {
                            sum += Number(value);
                        } else if (aColumns[index].operator === "-") {
                            sum -= Number(value);
                        }
                    })
                    this.setmodelproperty("tableData", sPath + "/" + cell.COL_ID + "/value", sum, true);
                    this._changeInput({}, {
                        newValue: sum,
                        column: cell.COL_ID,
                        row: cell.ROW_ID
                    });
                } else if (cell.FORMULAT_LEVEL === "ROW") {
                    const aRows = parseFormulaWithOperatorsAndTypes(cell.FORMULAR)
                    const aValues = aRows.map(row => {
                        if (row.operand === sRow && cell.COL_ID === sColumn) {
                            return newValue;
                        } else {
                            const data = this.getmodelproperty("tableData", getPath(row.operand) + "/" + sColumn + "/value")
                            return data === undefined ? 0 : data;
                        }
                    });
                    let sum = 0;
                    aValues.forEach((value, index) => {
                        if (aRows[index].operator === "+") {
                            sum += Number(value);
                        } else if (aRows[index].operator === "-") {
                            sum -= Number(value);
                        }
                    })
                    this.setmodelproperty("tableData", getPath(cell.ROW_ID) + "/" + sColumn + "/value", sum, true);
                    this._changeInput({}, {
                        newValue: sum,
                        column: cell.COL_ID,
                        row: cell.ROW_ID
                    });
                }
            })
        },
    });
});
