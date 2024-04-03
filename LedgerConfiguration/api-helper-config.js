$(document).ready(async function() {
    if ($('.apiHelper').length == 0) {
        return;
    }
    
    // Input field validation for 
    function validateInput(event) {
        const target = event.target; // The item within the table that triggered the event
        
        // Check if the event target is a number input
        if (target.tagName === 'INPUT' && target.type === 'number') {
            const min = parseFloat(target.min);
            const max = parseFloat(target.max);
            const value = parseFloat(target.value);
            
            // Custom validation logic
            if (value < min) {
                target.setCustomValidity(`The value must be greater than or equal to ${min}.`);
            } else if (value > max) {
                target.setCustomValidity(`The value must be less than or equal to ${max}.`);
            } else {
                target.setCustomValidity(''); // If the value is valid, clear the message
            }
            
            // Force the browser to check the validity state and display the custom message
            target.reportValidity();
        }
    } 
    
    // Function to add a checkbox cell with default value
    function addCheckboxCell($row, description, defaultValue) {
        const $checkboxCell = $('<td></td>');
        const $input = $('<input>', {
            type: 'checkbox',
            title: description,
            checked: defaultValue
        }).appendTo($checkboxCell);
        
        $row.append($checkboxCell);
    }
    
    // Add a free number field with validation and a default value
    function addTextCell($row, description, validation, defaultValue) {
        const $cell = $('<td></td>');
        const $input = $('<input>', {
            type: 'number', // or 'text' based on your specific needs
            title: description,
            value: defaultValue
        });
        
        // Apply validation parameters
        Object.entries(validation).forEach(([key, value]) => {
            $input.attr(key, value);
        });
        
        $cell.append($input);
        $row.append($cell);
    }
    
    // Function to add a select cell (dropdown) with tooltip and default value
    function addSelectCell($row, options, description, defaultValue) {
        const $cell = $('<td></td>');
        const $select = $('<select>', { title: description }).appendTo($cell);
        
        options.forEach(function(option) {
            const $option = $('<option>', {
                value: option,
                text: option, // Assuming the value and text are the same; adjust if not
                selected: option === defaultValue
            }).appendTo($select);
        });
        
        $row.append($cell);
    }
    
    // Add a new row to the configuration table, optionally taking in values to populate
    function addRow(config = {}) {
        const $tableBody = $('#configTable tbody');
        const $newRow = $('<tr></tr>');
        
        // Helper function to safely retrieve configuration values or default
        const getConfigValue = (key, defaultValue) => config.hasOwnProperty(key) ? config[key] : defaultValue;
        
        // Checkbox Cell for "enable"
        addCheckboxCell($newRow, "If enabled, poll the given Modbus server address.", getConfigValue('enable', true));
        
        // Text Cells with validation and default values
        addTextCell($newRow, "The remote device server ID (also known as slave ID). Range: 1-255.", { min: 1, max: 255 }, getConfigValue('id', 1));
        addTextCell($newRow, "Allowable time to wait for a response in milliseconds. Range: 0-10000.", { min: 0, max: 10000 }, getConfigValue('timeout', 2000));
        addTextCell($newRow, "Defines the frequency (in seconds) in which the register will be polled and results published.", { min: 1 }, getConfigValue('poll', 1));
        
        addSelectCell($newRow, ['always'], "Select when to publish the polled value.", getConfigValue('publish', 'always'));
        addSelectCell($newRow, ['coil', 'discrete_input', 'input_register', 'holding_register'], "Type of read function.", getConfigValue('function', 'coil'));
        addTextCell($newRow, "Address to read from, zero based. Range: 0-65535.", { min: 0, max: 65535 }, getConfigValue('address', 0));
        addSelectCell($newRow, ['int16', 'uint16', 'int32', 'uint32', 'float32_abcd', 'float32_badc', 'float32_cdab', 'float32_dcba', 'bits'], "Type of data being read.", getConfigValue('type', 'uint16'));
        
        addTextCell($newRow, "16-bit bitmask to apply to read value to isolate bits. Use 65535 if masking is not required. Range: 0-65535.", { min: 0, max: 65535 }, getConfigValue('mask', 65535));
        addTextCell($newRow, "Shifting, in bits, to right shift read value after masking. Use 0 if shifting is not required. Range: 0-15.", { min: 0, max: 15 }, getConfigValue('shift', 0));
        addTextCell($newRow, "Offset applied to masked and shifted input. This represents “b” in “y = mx + b”. Use 0 if not required (float variable).", {}, getConfigValue('offset', 0.0));
        addTextCell($newRow, "Scaling applied to masked and shifted input. This represents “m” in “y = mx + b”. Use 1 if not required (float variable).", {}, getConfigValue('scale', 1.0));
        
        // Actions buttons using jQuery
        const $actionsCell = $('<td class="actionsCell"></td>');
        const $flexContainer = $('<div></div>').css({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        });
        
        // Append Duplicate button
        $('<span role="button"><img src="copy.png" alt="Duplicate" title="Duplicate"></span>')
        .click(function() { duplicateRow($(this).closest('tr')); })
        .appendTo($flexContainer);
        
        // Append Delete button
        $('<span role="button"><img src="delete.png" alt="Delete" title="Delete"></span>')
        .click(function() { $(this).closest('tr').remove(); })
        .appendTo($flexContainer);
        
        $actionsCell.append($flexContainer);
        $newRow.append($actionsCell);
        
        $tableBody.append($newRow);
    }
    
    // Duplicate an existing row
    function duplicateRow($sourceRow) {
        // Step 1: Add a new row
        addRow(); // Assumes this adds a row with default inputs
        
        const $tableBody = $('#configTable tbody');
        const $newRow = $tableBody.find('tr').last(); // Get the newly added row
        
        // Step 2: Copy data from sourceRow to newRow
        const $sourceInputs = $sourceRow.find('input, select');
        const $newInputs = $newRow.find('input, select');
        
        $sourceInputs.each(function(index) {
            const $input = $(this);
            if ($input.is(':checkbox')) {
                $newInputs.eq(index).prop('checked', $input.prop('checked'));
            } else if ($input.is('select')) {
                $newInputs.eq(index).val($input.val());
            } else { // Handles text and number inputs
                $newInputs.eq(index).val($input.val());
            }
        });
    }

    // Translate Ledger into our config table
    function populateTableFromJson(jsonConfig) {
        // Handle rs485 configuration separately
        populateRS485Config(jsonConfig.rs485);

        // Clear configuration table
        $('#configTable tbody').empty();
    
        // Iterate through the monitor configuration array to add rows
        jsonConfig.monitor.forEach(function(configItem) {
            addRow(configItem); // Pass the entire item as the configuration object
        });
    }
    
    function populateRS485Config(rs485Config) {
        // Assuming you have specific inputs for rs485 settings in your HTML
        $('#baud').val(rs485Config.baud);
        $('#parity').val(rs485Config.parity);
        $('#imd').val(rs485Config.imd);
    }

    // Toast function for user feedback
    function showToast(message, isSuccess = true) {
        const $toast = $('#toast');
        $toast.text(message);
        $toast.css('background-color', isSuccess ? '#4CAF50' : '#F44336'); // Green for success, red for failure
        
        // Show the toast
        $toast.addClass('show');
        
        // After 3 seconds, hide the toast
        setTimeout(() => { $toast.removeClass('show'); }, 3000);
    }

    // Convert table data to JSON functions
    function constructConfigObject() {
        const rs485Config = {
            baud: $('#baud').val(),
            parity: $('#parity').val(),
            imd: parseInt($('#imd').val(), 10)
        };
        
        const monitorConfig = JSON.parse(tableToJson()); // Parse since tableToJson now directly returns a JSON string
        
        return {
            rs485: rs485Config,
            monitor: monitorConfig
        };
    }

    function tableToJson() {
        const jsonData = $('#configTable tbody tr').map(function() {
            return {
                enable: $(this).find('td:eq(0) input[type="checkbox"]').prop('checked'),
                id: parseInt($(this).find('td:eq(1) input').val(), 10),
                timeout: parseInt($(this).find('td:eq(2) input').val(), 10),
                poll: parseInt($(this).find('td:eq(3) input').val(), 10),
                publish: $(this).find('td:eq(4) select').val(),
                function: $(this).find('td:eq(5) select').val(),
                address: parseInt($(this).find('td:eq(6) input').val(), 10),
                type: $(this).find('td:eq(7) select').val(),
                mask: parseInt($(this).find('td:eq(8) input').val(), 10),
                shift: parseInt($(this).find('td:eq(9) input').val(), 10),
                offset: parseFloat($(this).find('td:eq(10) input').val()),
                scale: parseFloat($(this).find('td:eq(11) input').val()),
            };
        }).get(); // Use .get() to convert the jQuery object to an array
    
        return JSON.stringify(jsonData, null, 2);
    }
    
    // Login and Ledger functions

    // TODO: use urlOptions for Organization, Ledger, and Instance names
    let urlOptions = {};
    
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams) {
        let opt;
        org = urlParams.get('org');
        if (opt) {
            urlOptions.org = opt;
        }        
        
        opt = urlParams.get('ledger');
        if (opt) {
            urlOptions.ledger = parseInt(opt);
        }
        
        opt = urlParams.get('instance');
        if (opt) {
            urlOptions.instance = opt;
        }
    }
    
    async function buildLedgersList(orgId = "") {
        options = {};
        if (orgId) options.org = orgId;
        let ledgers = await apiHelper.listLedgers({org: orgId});
        
        const ledgerSelectElems = $('.apiHelperLedgerSelect');
        let html = '';
        if (ledgers.length > 0) {            
            for(let ledger of ledgers) {
                html += `<option value="${ledger.name}">${ledger.name} (${ledger.scope})</option>`
            }
            
            // Add our change handler events to refresh Ledger Instances List
            $('.apiHelperLedgerSelect').each(async function() {
                const ledgerSelectElem = $(this);
                
                $(ledgerSelectElem).off('change').on('change', async function() {
                    const ledgerSlug = $(ledgerSelectElem).val();
                    console.log(`Selected Ledger: ${ledgerSlug}`);
                    
                    $(ledgerSelectElem).val(ledgerSlug);
                    buildLedgerInstancesList(ledgerSlug);   // no org ID for sandbox
                });
                
            });
        }
        $(ledgerSelectElems).html(html);

        // Refresh ledger instances once built
        buildLedgerInstancesList(ledgers[0].name);
    }
    
    async function buildLedgerInstancesList(ledgerName) {
        const orgId = $(".apiHelperTrackerOrgSelect").find(":selected").val();

        let options = {};
        if (orgId != 'sandbox') options.org = orgId;
        options.ledgerName = ledgerName;
        
        let instances = await apiHelper.listLedgerInstances(options);
        
        const ledgerSelectElems = $('.apiHelperLedgerInstanceSelect');
        let html = '';
        
        if (instances.length > 0) {
            for(let inst of instances) {
                html += `<option value="${inst.scope.value}">${inst.scope.value} (${inst.scope.name || "no name"})</option>`
            }
        }
        
        $(ledgerSelectElems).html(html);
    }
    
    async function setupMenus() {
        try {
            // const productsResp = await apiHelper.getProducts();
            
            const orgsData = await apiHelper.getOrgs();
            
            // No orgs: orgsData.organizations empty array
            // Object in array orgsData.organizations: id, slug, name
            
            if (orgsData.organizations.length > 0) {
                const orgSelectElems = $('.apiHelperTrackerOrgSelect');
                
                let html = '<option value="sandbox" checked>Sandbox</option>';
                for(let org of orgsData.organizations) {
                    html += '<option value="' + org.id + '">' + org.name + '</option>';
                }
                $(orgSelectElems).html(html);
                
                $('.apiHelperTrackerOrgRow').show();
                
                $(orgSelectElems).each(async function() {
                    const orgSelectElem = $(this);
                    
                    $(orgSelectElem).on('change', async function() {
                        const orgId = $(orgSelectElem).val();
                        console.log(`Selected OrgId: ${orgId}`);
                        
                        $(orgSelectElems).val(orgId);
                        buildLedgersList(orgId);   // no org ID for sandbox
                    });
                    
                });
                
                await buildLedgersList();
            }
            else {
                $('.apiHelperTrackerOrgRow').hide();
            }
        }
        catch(e) {
            if (e.status == 401) {
                // Expired token
            }
            apiHelper.notLoggedIn();
        }
    };
    
    if (apiHelper.auth) {
        $('.apiHelperLedger').show();
        $('.apiHelperRS485Config').show();
        $('.apiHelperModbusConfig').show();
        setupMenus();
    }
    else {
        // Not logged in
        $('.apiHelperLedger').hide();
        $('.apiHelperRS485Config').hide();
        $('.apiHelperModbusConfig').hide();
    }

    // Event listeners
    $("#loadLedgerConfigButton").click(async function() {
        let options = {
            ledgerName: $(".apiHelperLedgerSelect").find(":selected").val() || "",
            scopeValue: $(".apiHelperLedgerInstanceSelect").find(":selected").val() || ""
        };
        if ($(".apiHelperTrackerOrgSelect").find(":selected").val() != 'sandbox') {
            options.org = $(".apiHelperTrackerOrgSelect").find(":selected").val() || ""
        }
        let ledger = await apiHelper.getLedgerInstance(options);
        console.log(ledger);

        try {
            populateTableFromJson(ledger.data);
            showToast("Load Success!", true);
        }
        catch(e) {
            showToast(`Load Failed!\n${e}`, false);
        }
    });
    
    $("#pushLedgerConfigButton").click(async function() {
        let options = {
            ledgerName: $(".apiHelperLedgerSelect").find(":selected").val() || "",
            scopeValue: $(".apiHelperLedgerInstanceSelect").find(":selected").val() || "",
            instance: {data: constructConfigObject()}
        };
        if ($(".apiHelperTrackerOrgSelect").find(":selected").val() != 'sandbox') {
            options.org = $(".apiHelperTrackerOrgSelect").find(":selected").val() || ""
        }
        try {
            await apiHelper.setLedgerInstance(options);
            showToast("Push Success!", true);
        }
        catch(e) {
            showToast(`Push Failed!\n${e}`, false);
        }
    });

    $('#addRowBtn').click(addRow);
    
    $('#configTable, #modbusRS485Config').on('input', validateInput);   // Validation callback for text fields

    $('#exportJsonBtn').click(function() {
        const jsonOutput = constructConfigObject();
        const jsonString = JSON.stringify(jsonOutput, null, 2);
        $('#jsonOutput').val(jsonString);
        $('#jsonModal').show();
    });

    $('#downloadJsonButton').click(async function() {
        const jsonData = $('#jsonOutput').val();
        const blob = new Blob([jsonData], {type: "application/json"});
        const url = URL.createObjectURL(blob);
    
        $('<a>', {
            href: url,
            download: "export.json"
        }).appendTo('body')[0].click();
    
        URL.revokeObjectURL(url); // Free up memory
        $('a[href="' + url + '"]').remove(); // Clean up the link element
    });

    $('#closeModalButton').click(function() {
        $('#jsonModal').hide();
    })
    
});

