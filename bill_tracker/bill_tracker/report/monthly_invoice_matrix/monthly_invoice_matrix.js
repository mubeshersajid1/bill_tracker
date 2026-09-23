window.open_customer_invoice_dialog = function (docname) {
    if (!docname) return;

    frappe.db.get_doc("Customer Invoice", docname).then(doc => {
        let d = new frappe.ui.Dialog({
            title: __('Update Customer Invoice: {0}', [docname]),
            fields: [
                {
                    label: 'Status',
                    fieldname: 'status',
                    fieldtype: 'Select',
                    options: ['Draft', 'Unpaid', 'Partially Paid', 'Paid', 'Overdue'],
                    default: doc.status,
                    reqd: 1
                },
                {
                    label: 'Total Paid',
                    fieldname: 'invoice_paid_amount',
                    fieldtype: 'Currency',
                    default: doc.invoice_paid_amount,
                    reqd: 1
                }
            ],
            primary_action_label: __('Update Record'),
            primary_action(values) {
                frappe.call({
                    method: 'frappe.client.set_value',
                    args: {
                        doctype: 'Customer Invoice',
                        name: docname,
                        fieldname: values
                    },
                    freeze: true,
                    freeze_message: __('Saving...'),
                    callback: function () {
                        d.hide();
                        frappe.show_alert({ message: __('Invoice updated successfully'), indicator: 'green' });
                        frappe.query_report.refresh();
                    }
                });
            }
        });
        d.show();
    });
};

frappe.query_reports["Monthly Invoice Matrix"] = {
    "filters": [],
    "formatter": function (value, row, column, data, default_formatter) {
        value = default_formatter(value, row, column, data);

        if (!data) return value;

        if (column.fieldname === "customer_id" && !data.is_summary) {
            let color = data.overall_status === "Paid" ? "#155724" : "#856404";
            let background = data.overall_status === "Paid" ? "#d4edda" : "#fff3cd";
            return `<span style="background-color: ${background}; color: ${color}; padding: 8px 8px; border-radius: 4px; font-weight: 600; display: inline-block;">${data.customer_name || data.customer_id}</span>`;
        }

        let monthKey = column.fieldname;
        let docName = data[`doc_${monthKey}`];
        let status = data[`status_${monthKey}`];
        let invoiceDate = data[`date_${monthKey}`];

        if (docName && status !== "-") {
            let isPaid = status === "Paid";
            let background = isPaid ? "#d4edda" : "#fff3cd";
            let color = isPaid ? "#155724" : "#856404";
            return `<span onclick="open_customer_invoice_dialog('${docName}')"
                          style="background-color: ${background}; color: ${color}; padding: 8px 8px; border-radius: 4px; font-weight: 600; display: block; text-align: center; cursor: pointer;"
                          title="Click to quick edit invoice">
                          ${value}<br><small>${status} | ${invoiceDate || ''}</small>
                    </span>`;
        }

        return value;
    },
    "get_datatable_options": function (options) {
        return Object.assign(options, {
            checkboxColumn: false,
            cellHeight: 70,
        });
    }
};
