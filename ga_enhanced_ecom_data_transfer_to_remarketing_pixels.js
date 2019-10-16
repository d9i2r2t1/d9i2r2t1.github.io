(function() {
    var gaEcomTransfer = {
        main: {
            vk: {
                //Name of the object to display in the console when the debug mode is activated
                debugName: 'vk',
        
                //Console output decoration when the debug mode is activated
                debugCSS: 'background-color: PowderBlue;',
        
                //Matching GA Enhanced Ecommerce events and VK pixel events
                eventsEcomm: {
                    impressions: ['view_home', 'view_category', 'view_search', 'view_other'],
                    detail: 'view_product',
                    add: 'add_to_cart',
                    remove: 'remove_from_cart',
                    checkout: 'init_checkout',
                    purchase: 'purchase'
                },

                //Openapi.js load waiting counter
                openapiLoadCounter: 0,

                /**
                * Getting the event name for a pixel.
                * @param {string} ecommEventName - GA Ecommerce event name.
                * @returns {string} VK pixel event name.
                */
                getEventName: function(ecommEventName) {
                    gaEcomTransfer.debug.log_start.call(this, 'vk.getEventName');
                    if (ecommEventName !== 'impressions') {
                        return this.eventsEcomm[ecommEventName];
                    }
                    else if (gaEcomTransfer.main.event.getPageType() === 'main') {
                        return this.eventsEcomm.impressions[0];
                    }
                    else if (gaEcomTransfer.main.event.getPageType() === 'catalog') {
                        return this.eventsEcomm.impressions[1];
                    }
                    else if (gaEcomTransfer.main.event.getPageType() === 'search') {
                        return this.eventsEcomm.impressions[2];
                    }
                    else {
                        return this.eventsEcomm.impressions[3];
                    }
                },

                /**
                * Getting event parameters for a pixel.
                * @param {Object[]} ecommEventProducts - An array of products and their parameters from the GA Ecommerce event.
                * @param {string} ecommEventCurrencyCode - Currency code from the GA Ecommerce event.
                * @param {(string|integer|float)} ecommEventRevenue - The total purchase amount from the GA Ecommerce event.
                * @param {string} ecommEventName - GA Ecommerce event name.
                * @returns {Object} Processed event parameters.
                */
                getEventParams: function(ecommEventProducts, ecommEventCurrencyCode, ecommEventRevenue, ecommEventName) {
                    gaEcomTransfer.debug.log_start.call(this, 'vk.getEventParams');
                    var eventParams = new this.eventParamConstructor(ecommEventProducts, ecommEventCurrencyCode, ecommEventRevenue);
                    if (ecommEventName === 'impressions') {
                        eventParams.total_price = undefined;
                        eventParams.currency_code = undefined;
                    }
                    for (var param in eventParams) {
                        if (!eventParams[param]) {
                            delete eventParams[param];
                        }
                    }
                    return eventParams;
                },

                /**
                * Event parameters object constructor.
                * @constructs eventParam
                * @param {Object[]} ecommEventProducts - An array of products and their parameters from the GA Ecommerce event.
                * @param {string} ecommEventCurrencyCode - Currency code from the GA Ecommerce event.
                * @param {(string|integer|float)} ecommEventRevenue - The total purchase amount from the GA Ecommerce event.
                */
                eventParamConstructor: function(ecommEventProducts, ecommEventCurrencyCode, ecommEventRevenue) {
                    gaEcomTransfer.debug.log_start.call(gaEcomTransfer.main.vk, 'vk.eventParamConstructor');
                    this.products = gaEcomTransfer.main.vk.getProductParams(ecommEventProducts);
                    this.category_ids = gaEcomTransfer.main.products.getCategoryString(ecommEventProducts);
                    this.currency_code = gaEcomTransfer.main.products.getCurrencyCode('vk', ecommEventCurrencyCode);
                    this.total_price = gaEcomTransfer.main.products.getTotalPrice(ecommEventProducts, ecommEventRevenue);
                    this.search_string = gaEcomTransfer.main.event.getSiteSearchPhrase();
                },

                /**
                * Getting the parameters of the product object for a pixel.
                * @param {Object[]} ecommEventProducts - An array of products and their parameters from the GA Ecommerce event.
                * @returns {Object[]} Product parameters.
                */
                getProductParams: function(ecommEventProducts) {
                    gaEcomTransfer.debug.log_start.call(this, 'vk.getProductParams');
                    var arr = [];
                    for (var i = 0; i < ecommEventProducts.length; i++) {
                        var productParams = new Object({
                            id: String(ecommEventProducts[i].id),
                            group_id: String(ecommEventProducts[i].brand),
                            price: (parseInt(ecommEventProducts[i].price * 100, 10)) / 100
                        });
                        for (var param in productParams) {
                            if (!productParams[param]) {
                                delete productParams[param];
                            }
                        }
                        arr.push(productParams);
                    }
                    return arr;
                },

                /**
                * Price list selection.
                * @param {string} hostname - Page hostname.
                * @returns {string} Price list ID.
                */
                getPriceListId: function(hostname) {
                    gaEcomTransfer.debug.log_start.call(this, 'vk.getPriceListId');
                    if (gaEcomTransfer.settings.vk.fewPriceLists) {
                        return gaEcomTransfer.settings.vk.priceListIds[hostname];
                    }
                    else {
                        return gaEcomTransfer.settings.vk.priceListId;
                    }
                },

                /**
                * Openapi.js inject.
                */
                openapiInit: function() {
                    gaEcomTransfer.debug.log_start.call(this, 'vk.openapiInit');
                    if (document.getElementById('vk_api_transport')) {
                        gaEcomTransfer.debug.log.call(this, 'Failed to load openapi.js');
                        return;
                    }
                    var openapi = document.createElement('div');
                    var body = document.getElementsByTagName('body')[0];
                    var el = document.createElement('script');
                    openapi.id = 'vk_api_transport';
                    body.insertBefore(openapi, body.firstChild);
                    el.type = 'text/javascript';
                    el.src = 'https://vk.com/js/api/openapi.js?159';
                    el.async = true;
                    document.getElementById('vk_api_transport').appendChild(el);
                    gaEcomTransfer.debug.log.call(this, 'Div with openapi.js was installed');
                },

                /**
                * VK pixel initialization.
                * @param {string} pixelID - VK pixel ID.
                */
                pixelInit: function(pixelID) {
                    gaEcomTransfer.debug.log_start.call(this, 'vk.pixelInit');
                    VK.Retargeting.Init(pixelID);
                    gaEcomTransfer.debug.log.call(this, 'Pixel was initialized:', pixelID);
                },

                /**
                * Sending pageview to VK pixel.
                */
                sendPageView: function() {
                    gaEcomTransfer.debug.log_start.call(this, 'vk.sendPageView');
                    if (!window.VK) {
                        gaEcomTransfer.debug.log.call(this, 'VK not found, trying to install openapi.js...');
                        this.openapiInit();
                        window.vkAsyncInit = function() {
                            gaEcomTransfer.debug.log.call(gaEcomTransfer.main.vk, 'vkAsyncInit: sending pageview to VK pixel...');
                            for (var i = 0; i < gaEcomTransfer.settings.vk.pixelIDs.length; i++) {
                                gaEcomTransfer.main.vk.pixelInit(gaEcomTransfer.settings.vk.pixelIDs[i]);
                                VK.Retargeting.Hit();
                                gaEcomTransfer.debug.log.call(gaEcomTransfer.main.vk, 'Pageview was sent to', gaEcomTransfer.settings.vk.pixelIDs[i]);
                            }
                        };
                    } 
                    else {
                        gaEcomTransfer.debug.log.call(this, 'Sending pageview to VK pixel...');
                        for (var i = 0; i < gaEcomTransfer.settings.vk.pixelIDs.length; i++) {
                            gaEcomTransfer.main.vk.pixelInit(gaEcomTransfer.settings.vk.pixelIDs[i]);
                            VK.Retargeting.Hit();
                            gaEcomTransfer.debug.log.call(gaEcomTransfer.main.vk, 'Pageview was sent to', gaEcomTransfer.settings.vk.pixelIDs[i]);
                        }
                    }
                },

                /**
                * Sending event data to VK pixel.
                * @param {string} ecommEventName - GA Ecommerce event name.
                * @param {Object[]} ecommEventProducts - An array of products and their parameters from the GA Ecommerce event.
                * @param {string} ecommEventCurrencyCode - Currency code from the GA Ecommerce event.
                * @param {(string|integer|float)} ecommEventRevenue - The total purchase amount from the GA Ecommerce event.
                */
                sendEvent: function(ecommEventName, ecommEventProducts, ecommEventCurrencyCode, ecommEventRevenue) {
                    gaEcomTransfer.debug.log_start.call(gaEcomTransfer.main.vk, 'vk.sendEvent');
                    if (window.VK) {
                        gaEcomTransfer.debug.log.call(gaEcomTransfer.main.vk, 'Sending event data to VK pixel...');
                        var pixelEvent = new gaEcomTransfer.main.event.eventConstructor('vk', ecommEventName, ecommEventProducts, ecommEventCurrencyCode, ecommEventRevenue);
                        var priсeListID = gaEcomTransfer.main.vk.getPriceListId(gaEcomTransfer.main.url.host);
                        var name = pixelEvent.name;
                        var params = pixelEvent.params;
                        if (!gaEcomTransfer.settings.vk.pixelIDs) {
                            VK.Retargeting.ProductEvent(priсeListID, name, params);
                            gaEcomTransfer.debug.log.call(gaEcomTransfer.main.vk, 'Event data:', priсeListID, name, params, 'was sent to VK pixel');
                        }
                        else {
                            for (var i = 0; i < gaEcomTransfer.settings.vk.pixelIDs.length; i++) {
                                gaEcomTransfer.main.vk.pixelInit(gaEcomTransfer.settings.vk.pixelIDs[i]);
                                VK.Retargeting.ProductEvent(priсeListID, name, params);
                                gaEcomTransfer.debug.log.call(gaEcomTransfer.main.vk, 'Event data:', priсeListID, name, params, 'was sent to', gaEcomTransfer.settings.vk.pixelIDs[i]);
                            }
                        }
                    } 
                    else if (document.getElementById('vk_api_transport') && gaEcomTransfer.main.vk.openapiLoadCounter < 100) {
                            gaEcomTransfer.debug.log.call(gaEcomTransfer.main.vk, 'VK not found, waiting for openapi.js load... Attempts left:', 99 - gaEcomTransfer.main.vk.openapiLoadCounter);
                            setTimeout(gaEcomTransfer.main.vk.sendEvent, 100, ecommEventName, ecommEventProducts, ecommEventCurrencyCode, ecommEventRevenue);
                            gaEcomTransfer.main.vk.openapiLoadCounter++;
                    } 
                    else {
                        gaEcomTransfer.debug.log.call(gaEcomTransfer.main.vk, 'VK not found, event data cannot be sent to VK pixel');
                        return;
                    }
                }
            },

            products: {
                //Name of the object to display in the console when the debug mode is activated
                debugName: 'products',

                /**
                * Getting a list of product categories.
                * @param {Object[]} ecommEventProducts - An array of products and their parameters from the GA Ecommerce event.
                * @returns {string} List of product categories.
                */
                getCategoryString: function(ecommEventProducts) {
                    gaEcomTransfer.debug.log_start.call(this, 'products.getCategoryString');
                    var categoryId = '';
                    var check = [];
                    for (var i = 0; i < ecommEventProducts.length; i++) {
                        if (check.indexOf(ecommEventProducts[i].category) === -1) {
                            check.push(ecommEventProducts[i].category);
                            categoryId += ',' + ecommEventProducts[i].category;
                        }
                    }
                    categoryId = categoryId.slice(1);
                    return categoryId;
                },

                /**
                * Getting the currency of the price of the products.
                * @param {string} pixel - Name of the pixel for which you want to find the currency code.
                * @param {string} ecommEventCurrencyCode - Currency code from the GA Ecommerce event.
                * @returns {string} Currency code.
                */
                getCurrencyCode: function(pixel, ecommEventCurrencyCode) {
                    gaEcomTransfer.debug.log_start.call(this, 'products.getCurrencyCode');
                    if (!ecommEventCurrencyCode) {
                        return gaEcomTransfer.settings[pixel].defaultCurrency;
                    }
                    else {
                        return ecommEventCurrencyCode;
                    }
                },

                //метод определения общей стоимости товаров
                getTotalPrice: function(ecommEventProducts, ecommEventRevenue) {
                    gaEcomTransfer.debug.log_start.call(this, 'products.getTotalPrice');
                    if (ecommEventRevenue !== 'not set') {
                        return (parseInt(ecommEventRevenue * 100, 10)) / 100;
                    } 
                    else {
                        var sumPrice = 0;
                        for (var i = 0; i < ecommEventProducts.length; i++) {
                            if (ecommEventProducts[i].hasOwnProperty('quantity')) {
                                sumPrice += ((parseInt(ecommEventProducts[i].price * 100, 10)) / 100) * parseInt(ecommEventProducts[i].quantity, 10);
                            }
                            else {
                                sumPrice += (parseInt(ecommEventProducts[i].price * 100, 10)) / 100;
                            }
                        }
                        return sumPrice;
                    }
                }
            },

            event: {
                //Name of the object to display in the console when the debug mode is activated
                debugName: 'event',

                /**
                * Event validation for sending data in pixels.
                * @param {string} ecommEventName - GA Ecommerce event name.
                * @param {Object} ecommEventObj - GA Ecommerce object.
                * @returns {Object} Result of checking.
                */
                eventCheck: function(ecommEventName, ecommEventObj) {
                    gaEcomTransfer.debug.log_start.call(this, 'event.eventCheck');
                    var eventCheckedObj = {};
                    for (var pixel in gaEcomTransfer.settings.pixels) {
                        if (gaEcomTransfer.settings.pixels[pixel]) {
                            if (!gaEcomTransfer.main[pixel].eventsEcomm.hasOwnProperty(ecommEventName)) {
                                eventCheckedObj[pixel] = false;
                            }
                            else if (ecommEventName === 'checkout' && parseInt(ecommEventObj.actionField.step, 10) !== 1) {
                                eventCheckedObj[pixel] = false;
                            }
                            else if (gaEcomTransfer.main[pixel].hasOwnProperty('eventCheck') && !gaEcomTransfer.main[pixel].eventCheck(ecommEventName, ecommEventObj)) {
                                eventCheckedObj[pixel] = false;
                            }
                            else {
                                eventCheckedObj[pixel] = true;
                            }
                        } 
                        else {
                            eventCheckedObj[pixel] = false;
                        }
                    }
                    return eventCheckedObj;
                },

                /**
                * Event object constructor.
                * @constructs event
                * @param {string} pixel - Name of the pixel for which you want to generate event object.
                * @param {string} ecommEventName - GA Ecommerce event name.
                * @param {Object[]} ecommEventProducts - An array of products and their parameters from the GA Ecommerce event.
                * @param {string} ecommEventCurrencyCode - Currency code from the GA Ecommerce event.
                * @param {(string|integer|float)} ecommEventRevenue - The total purchase amount from the GA Ecommerce event.
                */
                eventConstructor: function(pixel, ecommEventName, ecommEventProducts, ecommEventCurrencyCode, ecommEventRevenue) {
                    gaEcomTransfer.debug.log_start.call(gaEcomTransfer.main.event, 'event.eventConstructor');
                    this.name = gaEcomTransfer.main[pixel].getEventName(ecommEventName);
                    this.params = gaEcomTransfer.main[pixel].getEventParams(ecommEventProducts, ecommEventCurrencyCode, ecommEventRevenue, ecommEventName);
                },

                /**
                * Page type definition.
                * @returns {string} Page type.
                */
                getPageType: function() {
                    gaEcomTransfer.debug.log_start.call(this, 'event.getPageType');
                    if (gaEcomTransfer.settings.useGTMvarPageType) {
                        if (gaEcomTransfer.settings.pageTypeGTM === gaEcomTransfer.settings.pageTypeGTMnames.main) {
                            gaEcomTransfer.debug.log.call(this, 'Page type found by GTM variable: main');
                            return 'main';
                        }
                        else if (gaEcomTransfer.settings.pageTypeGTMnames.catalog && gaEcomTransfer.settings.pageTypeGTMnames.catalog.indexOf(gaEcomTransfer.settings.pageTypeGTM) !== -1) {
                            gaEcomTransfer.debug.log.call(this, 'Page type found by GTM variable: catalog');
                            return 'catalog';
                        }
                        if (gaEcomTransfer.settings.pageTypeGTM === gaEcomTransfer.settings.siteSearchPage) {
                            gaEcomTransfer.debug.log.call(this, 'Page type found by GTM variable: search');
                            return 'search';
                        }
                        else {
                            gaEcomTransfer.debug.log.call(this, 'Page type found by GTM variable: other');
                            return 'other';
                        }
                    }
                    else {
                        if (gaEcomTransfer.settings.mainPage && gaEcomTransfer.main.url.href.match(gaEcomTransfer.settings.mainPage) !== null) {
                            gaEcomTransfer.debug.log.call(this, 'Page type: main');
                            return 'main';
                        }
                        else if (gaEcomTransfer.settings.catalogPage && gaEcomTransfer.main.url.href.match(gaEcomTransfer.settings.catalogPage) !== null) {
                            gaEcomTransfer.debug.log.call(this, 'Page type: catalog');
                            return 'catalog';
                        }
                        else if (gaEcomTransfer.settings.siteSearchPage && gaEcomTransfer.main.url.href.match(gaEcomTransfer.settings.siteSearchPage) !== null) {
                            gaEcomTransfer.debug.log.call(this, 'Page type: search');
                            return 'search';
                        }
                        else {
                            gaEcomTransfer.debug.log.call(this, 'Page type: other');
                            return 'other';
                        }
                    }
                },

                /**
                * Getting a site search query.
                * @returns {string} Search query.
                */
                getSiteSearchPhrase: function() {
                    gaEcomTransfer.debug.log_start.call(this, 'event.getSiteSearchPhrase');
                    if (gaEcomTransfer.settings.siteSearchQueryParam && this.getPageType() === 'search') {
                        var query = gaEcomTransfer.main.url.search.substring(1);
                        var vars = query.split('&');
                        var queryString = {};
                        for (var i = 0; i < vars.length; i++) {
                            var pair = vars[i].split('=');
                            if (typeof queryString[pair[0]] === 'undefined') {
                                queryString[pair[0]] = decodeURIComponent(pair[1]);
                            }
                            else if (typeof queryString[pair[0]] === 'string') {
                                var arr = [queryString[pair[0]], decodeURIComponent(pair[1])];
                                queryString[pair[0]] = arr;
                            } 
                            else {
                                queryString[pair[0]].push(decodeURIComponent(pair[1]));
                            }
                        }
                        for (var param in queryString) {
                            if (Array.isArray(queryString[param])) {
                                queryString[param] = queryString[param].join();
                            }
                        }
                        gaEcomTransfer.debug.log.call(this, 'Site search query:', queryString[gaEcomTransfer.settings.siteSearchQueryParam]);
                        return queryString[gaEcomTransfer.settings.siteSearchQueryParam];
                    }
                    else {
                        gaEcomTransfer.debug.log.call(this, 'Site search query not found');
                    }
                }
            },

            //Page URL parameters
            url: {
                host: window.location.hostname,
                search: window.location.search,
                href: window.location.href
            },

            //Name of the object to display in the console when the debug mode is activated
            debugName: 'system',

            /**
            * Run tag first time.
            */
            firstStart: function() {
                gaEcomTransfer.debug.log_start.call(this, 'firstStart');
                for (var pixel in gaEcomTransfer.settings.pixels) {
                    if (gaEcomTransfer.settings.pixels[pixel] && gaEcomTransfer.settings[pixel].baseCode) {
                        gaEcomTransfer.main[pixel].sendPageView();
                    }
                }
                if (window.dataLayer) {
                    for (var i = 0;  i < dataLayer.length; i++) {
                        if (!dataLayer[i].hasOwnProperty('ecommerce')) {
                            gaEcomTransfer.debug.log.call(this, 'There is no ecommerce in dataLayer event');
                            continue;
                        }
                        gaEcomTransfer.debug.log.call(this, 'Ecommerce found, start processing...');
                        var ecommEventCurrencyCode = dataLayer[i].ecommerce.currencyCode;
                        for (var property in dataLayer[i].ecommerce) {
                            gaEcomTransfer.debug.log.call(this, 'Start processing ecommerce event', property);
                            var products = undefined;
                            var revenue = undefined;
                            if (property !== 'impressions') {
                                products = dataLayer[i].ecommerce[property].products;
                            } 
                            else {
                                products = dataLayer[i].ecommerce[property];
                            }
                            if (property === 'purchase' && dataLayer[i].ecommerce[property].actionField.hasOwnProperty('revenue')) {
                                revenue = dataLayer[i].ecommerce[property].actionField.revenue;
                            }
                            else {
                                revenue = 'not set';
                            }
                            gaEcomTransfer.debug.log.call(this, 'Start validate ecommerce event', property);
                            var eventCheckedObj = gaEcomTransfer.main.event.eventCheck(property, dataLayer[i].ecommerce[property]);
                            for (var checkedPixel in eventCheckedObj) {
                                if (eventCheckedObj[checkedPixel]) {
                                    gaEcomTransfer.debug.log.call(this, 'Ecommerce event', property, 'has passed validation for', checkedPixel, ', start sending data...');
                                    gaEcomTransfer.main[checkedPixel].sendEvent(property, products, ecommEventCurrencyCode, revenue);
                                } 
                                else {
                                    gaEcomTransfer.debug.log.call(this, 'Ecommerce event', property, 'failed validation for', checkedPixel);
                                }
                            }
                        }
                    }
                } 
            },

            /**
            * Set dataLayer.push listener.
            * @param {function} originalDataLayerPush - Original dataLayer.push method.
            */
            setDataLayerPushListener: function(originalPush) {
                gaEcomTransfer.debug.log.call(this, 'Setting dataLayer.push listener...');
                dataLayer.push = function() {
                    gaEcomTransfer.debug.log.call(gaEcomTransfer.main, 'DataLayer.push was intercepted');
                    originalPush.apply(this, arguments);
                    gaEcomTransfer.debug.log.call(gaEcomTransfer.main, 'Original dataLayer.push has been sent');
                    if (!arguments[0].hasOwnProperty('ecommerce')) {
                        gaEcomTransfer.debug.log.call(gaEcomTransfer.main, 'No ecommerce events were found in the intercepted dataLayer.push');
                        return;
                    } 
                    else {
                        gaEcomTransfer.main.otherStart(arguments[0]);
                    }
                };
            },

            /**
            * Run tag after dataLayer.push intercepting.
            * @param {Object} dataLayerPushArg - Original dataLayer.push argument.
            */
            otherStart: function(dataLayerPushArg) {
                gaEcomTransfer.debug.log_start.call(this, 'otherStart');
                var ecommEventCurrencyCode = dataLayerPushArg.ecommerce.currencyCode;
                for (var property in dataLayerPushArg.ecommerce) {
                    gaEcomTransfer.debug.log.call(this, 'Start processing dataLayer.push ecommerce event', property);
                    var products = undefined;
                    var revenue = undefined;
                    if (property !== 'impressions') {
                        products = dataLayerPushArg.ecommerce[property].products;
                    } 
                    else {
                        products = dataLayerPushArg.ecommerce[property];
                    }
                    if (property === 'purchase' && dataLayerPushArg.ecommerce[property].actionField.hasOwnProperty('revenue')) {
                        revenue = dataLayerPushArg.ecommerce[property].actionField.revenue;
                    }
                    else {
                        revenue = 'not set';
                    }
                    gaEcomTransfer.debug.log.call(this, 'Start validate dataLayer.push ecommerce event', property);
                    var eventCheckedObj = gaEcomTransfer.main.event.eventCheck(property, dataLayerPushArg.ecommerce[property]);
                    for (var checkedPixel in eventCheckedObj) {
                        if (eventCheckedObj[checkedPixel]) {
                            gaEcomTransfer.debug.log.call(this, 'DataLayer.push ecommerce event', property, 'has passed validation for', checkedPixel, ', start sending data...');
                            gaEcomTransfer.main[checkedPixel].sendEvent(property, products, ecommEventCurrencyCode, revenue);
                        } 
                        else {
                            gaEcomTransfer.debug.log.call(this, 'DataLayer.push ecommerce event', property, 'failed validation for', checkedPixel);
                        }
                    }
                }
            }

        },

        debug: {
            /**
            * Сonsole logging when the debug mode is activated
            */
            log: function() {
                var argArr = [];
                for(var i = 0; i < arguments.length; i++) {
                    if (typeof arguments[i] === 'object') {
                        arguments[i] = JSON.stringify(arguments[i]);
                    }
                    argArr.push(arguments[i]);
                }
                if (gaEcomTransfer.settings.debug && /was sent to/.test(argArr.join(' '))) {
                    console.log('[gaEcomTransfer]%c[' + this.debugName + ' *SEND*]', this.debugCSS + 'font-weight: bold;', argArr.join(' '));
                }
                else if (gaEcomTransfer.settings.debug && /failed validation for/.test(argArr.join(' '))) {
                    console.log('[gaEcomTransfer]%c[' + this.debugName + ']', 'background-color: LightCoral;', argArr.join(' '));
                }
                else if (gaEcomTransfer.settings.debug && /(Ecommerce found)|(has passed validation for)|(Start processing.*ecommerce event)/.test(argArr.join(' '))) {
                    console.log('[gaEcomTransfer]%c[' + this.debugName + ']', 'background-color: PaleGreen;', argArr.join(' '));
                }
                else if (gaEcomTransfer.settings.debug) {
                    console.log('[gaEcomTransfer]%c[' + this.debugName + ']', this.debugCSS, argArr.join(' '));
                }
            },

            /**
            * Сonsole logging at method starts when the debug mode is activated
            */
            log_start: function(methodPath) {
                if (gaEcomTransfer.settings.debug) {
                    console.log('[gaEcomTransfer]%c[' + this.debugName + ']', this.debugCSS, 'Start gaEcomTransfer.main.' + methodPath + '()');
                }
            },
        },

        start: function() {
            try {
                gaEcomTransfer.main.firstStart();
                if (window.dataLayer) {
                    gaEcomTransfer.main.setDataLayerPushListener(dataLayer.push);
                }
                else {
                    gaEcomTransfer.debug.log.call(gaEcomTransfer.main, 'DataLayer not found, can’t install dataLayer.push listener');
                }
            } 
            catch(e) {
                console.log('[gaEcomTransfer] UNKNOWN ERROR');
            }
        }
    };

    if (!window.gaEcomTransfer) {
        window.gaEcomTransfer = gaEcomTransfer;
    }
})();