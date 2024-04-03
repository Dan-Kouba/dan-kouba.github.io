// Ledger-specific APIs to add to apiHelper

$(document).ready(function() {
    if ($('.apiHelper').length == 0) {
        return;
    }

    apiHelper.listLedgers = async function(options) {
        let result = [];

        try {
            for(let page = 1; page < 100; page++) {
                const res = await apiHelper.particle.listLedgers({
                    auth: apiHelper.auth.access_token,
                    org: options.org,
                    page
                });
                console.log(res.body);
                for (const ledger of res.body.ledgers) {
                    console.log(`Ledger: ${ledger}`);
                    result.push(ledger);
                }           

                if (page >= res.body.meta.total_pages) {
                    break;
                }
            }
        }
        catch(e) {
            console.log('exception in listLedgers', e);
        }
        
        return result;
    }

    apiHelper.listLedgerInstances = async function(options) {
        // options.ledgerName
        let result = [];

        try {
            for(let page = 1; page < 100; page++) {
                const res = await apiHelper.particle.listLedgerInstances({
                    auth: apiHelper.auth.access_token,
                    org: options.org,
                    ledgerName: options.ledgerName,
                    page,
                });
                // res.body
                //   .instances (array)
                //      .version (string, guid)
                //      .scope (object)
                //          .name (string, device name)
                //          .type (string scope, "Device")
                //          .value (string, Device ID)
                //   .meta .page, .per_page, .total_page
                for (const inst of res.body.instances) {
                    result.push(inst);
                }           

                if (page >= res.body.meta.total_pages) {
                    break;
                }
            }
        }
        catch(e) {
            console.log('exception in listLedgerInstances', e);
        }

        return result;
    }

    apiHelper.getLedgerInstance = async function(options) {
        // try {
            const res = await apiHelper.particle.getLedgerInstance({
                auth: apiHelper.auth.access_token,
                org: options.org,
                ledgerName: options.ledgerName,
                scopeValue: options.scopeValue
            });
            console.log(res.body);
            return res.body.instance;
        // }
        // catch(e) {
        //     console.log("exception in getLedgerInstance", e);
        // }
    }

    apiHelper.setLedgerInstance = async function(options) {
        // try {
            const res = await apiHelper.particle.setLedgerInstance({
                auth: apiHelper.auth.access_token,
                org: options.org,
                ledgerName: options.ledgerName,
                scopeValue: options.scopeValue,
                instance: options.instance
            });
        // }
        // catch(e) {
        //     console.log("exception in setLedgerInstance", e);
        // }
    }
    
});
