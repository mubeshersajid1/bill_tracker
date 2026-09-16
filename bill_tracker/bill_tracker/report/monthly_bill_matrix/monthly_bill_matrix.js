// Global Quick Edit Modal Launcher
window.open_bill_payment_dialog = function (docname) {
    if (!docname) return;

    frappe.db.get_doc("Bill Payment", docname).then(doc => {
        let d = new frappe.ui.Dialog({
            title: __('Update Bill Payment: {0}', [docname]),
            fields: [
                {
                    label: 'Status',
                    fieldname: 'status',
                    fieldtype: 'Select',
                    options: ['Pending', 'Paid'],
                    default: doc.status,
                    reqd: 1
                },
                {
                    label: 'Amount',
                    fieldname: 'amount',
                    fieldtype: 'Currency',
                    default: doc.amount,
                    reqd: 1
                },
                {
                    label: 'Paid Date',
                    fieldname: 'paid_date',
                    fieldtype: 'Date',
                    default: doc.paid_date || frappe.datetime.get_today(),
                    depends_on: 'eval:doc.status=="Paid"'
                }
            ],
            primary_action_label: __('Update Record'),
            primary_action(values) {
                frappe.call({
                    method: 'frappe.client.set_value',
                    args: {
                        doctype: 'Bill Payment',
                        name: docname,
                        fieldname: values
                    },
                    freeze: true,
                    freeze_message: __('Saving...'),
                    callback: function (r) {
                        d.hide();
                        frappe.show_alert({ message: __('Payment updated successfully'), indicator: 'green' });
                        frappe.query_report.refresh();
                    }
                });
            }
        });
        d.show();
    });
};

frappe.query_reports["Monthly Bill Matrix"] = {
    "filters": [],
    "onload": function(report) {
        // Add "Generate Monthly Bills" button to report page header
        report.page.add_inner_button(__('Generate Monthly Bills'), function() {
            frappe.prompt(
                [
                    {
                        label: 'Billing Month',
                        fieldname: 'billing_month',
                        fieldtype: 'Select',
                        options: [
                            'Jan-2026', 'Feb-2026', 'Mar-2026', 'Apr-2026', 
                            'May-2026', 'Jun-2026', 'Jul-2026', 'Aug-2026', 
                            'Sep-2026', 'Oct-2026', 'Nov-2026', 'Dec-2026'
                        ],
                        default: 'Sep-2026',
                        reqd: 1
                    }
                ],
                function(values) {
                    frappe.call({
                        method: 'bill_tracker.api.generate_monthly_bills',
                        args: {
                            billing_month: values.billing_month
                        },
                        freeze: true,
                        freeze_message: __('Generating monthly bills...'),
                        callback: function(r) {
                            if (r.message) {
                                frappe.msgprint(r.message);
                                frappe.query_report.refresh();
                            }
                        }
                    });
                },
                __('Select Billing Month'),
                __('Generate')
            );
        });
    },
    "formatter": function (value, row, column, data, default_formatter) {
        value = default_formatter(value, row, column, data);

        if (!data) return value;

        // Summary Rows Formatting
        if (data.is_summary) {
            if (column.fieldname === "category") {
                return `<b style="color: #111827; font-weight: 700;">${data.category || ''}</b>`;
            }
            if (column.fieldname && column.fieldname.startsWith("amount_")) {
                return `<b>${value}</b>`;
            }
        }

        // Category Status Badges
        if (column.fieldname === "category" && !data.is_summary) {
            if (data.overall_status === "Paid") {
                return `<span style="background-color: #d4edda; color: #155724; padding: 4px 8px; border-radius: 4px; font-weight: 600; display: inline-block;">${data.category}</span>`;
            } else if (data.overall_status === "Pending") {
                return `<span style="background-color: #fff3cd; color: #856404; padding: 4px 8px; border-radius: 4px; font-weight: 600; display: inline-block;">${data.category}</span>`;
            }
        }

        // Interactive Clickable Status Badges
        if (column.fieldname && column.fieldname.startsWith("status_")) {
            let m_key = column.fieldname.replace("status_", "");
            let docName = data[`doc_${m_key}`];
            let statusVal = data[column.fieldname];

            if (docName && statusVal !== "-") {
                let bg = statusVal === "Paid" ? "#d4edda" : "#fff3cd";
                let color = statusVal === "Paid" ? "#155724" : "#856404";

                return `<span onclick="open_bill_payment_dialog('${docName}')" 
                              style="background-color: ${bg}; color: ${color}; padding: 4px 8px; border-radius: 4px; font-weight: 600; display: block; text-align: center; cursor: pointer;"
                              title="Click to quick edit payment">
                              ${statusVal} ✏️
                        </span>`;
            }
        }

        return value;
    },
    "get_datatable_options": function (options) {
        return Object.assign(options, {
            checkboxColumn: false,
            cellHeight: 40,
        });
    }
};