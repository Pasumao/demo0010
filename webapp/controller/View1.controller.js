sap.ui.define([
    "./CC/Base/BaseController"
], function (BaseController) {
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
            const req = await fetch("http://localhost:8080/sap/bc/http/sap/zasgr_http_api?IF_NAME=8000&IF_MODE=POST", {
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

            this._mergeData = data.TO_FORMULAR;

            const oTable = this.byId("idTable")
            aColumns.forEach(cloumn => {
                oTable.addColumn(new sap.ui.table.Column({
                    label: new sap.m.Label({ text: cloumn.TEXT }),
                    template: cloumn.RC_ID === "C000"
                        ? new sap.m.Text({ text: `{tableData>${cloumn.RC_ID}}` })
                        : new sap.m.Input({
                            value: `{tableData>${cloumn.RC_ID}}`,
                            liveChange: this._changeInput.bind(this),
                            type: sap.m.InputType.Number
                        })
                }))
            })

            this.setmodeldata("tableData", aRows.map(row => {
                return {
                    "C000": row.TEXT
                }
            }))

            setTimeout(() => {
                this.__autoWidthTable(oTable)
            }, 0)



        },

        _changeInput(oEvent) {

            const getRow = (sPath) => {
                const index = sPath.substring(sPath.lastIndexOf("/") + 1);
                const rowIndex = Number(index) + 1;
                return "R" + rowIndex.toString().padStart(3, '0');
            }

            const getPath = (sRow) => {
                return "/" + (parseInt(sRow.substring(1), 10) - 1);
            }

            const newValue = oEvent.getParameter("newValue");
            const oInput = oEvent.getSource();
            const sColumn = oInput.getBindingInfo("value").binding.sPath;
            const sPath = oInput.getBindingInfo("value").binding.oContext.sPath
            const sRow = getRow(sPath)

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
                    const aColumns = cell.FORMULAR.split("+");
                    const aValues = aColumns.map(column => {
                        if (column === sColumn && cell.ROW_ID === sRow) {
                            return newValue;
                        } else {
                            const data = this.getmodelproperty("tableData", sPath + "/" + column)
                            return data === undefined ? 0 : data;
                        }
                    });
                    let sum = 0;
                    aValues.forEach(value => {
                        sum += Number(value);
                    })
                    this.setmodelproperty("tableData", sPath + "/" + cell.COL_ID, sum);
                } else if (cell.FORMULAT_LEVEL === "ROW") {
                    const aColumns = cell.FORMULAR.split("+");
                    const aValues = aColumns.map(row => {
                        if (row === sRow && cell.COL_ID === sColumn) {
                            return newValue;
                        } else {
                            const data = this.getmodelproperty("tableData", getPath(row) + "/" + sColumn)
                            return data === undefined ? 0 : data;
                        }
                    });
                    let sum = 0;
                    aValues.forEach(value => {
                        sum += Number(value);
                    })
                    this.setmodelproperty("tableData", getPath(cell.ROW_ID) + "/" + sColumn, sum);
                }
            })
        },
    });
});
