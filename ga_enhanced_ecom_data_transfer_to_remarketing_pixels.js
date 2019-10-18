(function() {
    if (!window.gaEcomTransfer) window.gaEcomTransfer = function(settings) {
        var main = {
            vk: {
                // Name of the object to display in the console when the debug mode is activated
                debugName: 'vk',
            
                // Console output decoration when the debug mode is activated
                debugCSS: 'background-color: PowderBlue;',
            
                // Matching GA Enhanced Ecommerce events and VK pixel events
                eventsEcomm: {
                    impressions: ['view_home', 'view_category', 'view_search', 'view_other'],
                    detail: 'view_product',
                    add: 'add_to_cart',
                    remove: 'remove_from_cart',
                    checkout: 'init_checkout',
                    purchase: 'purchase'
                },
    
                // Openapi.js load waiting counter
                openapiLoadCounter: 0,
    
                /**
                * Getting the event name for a pixel.
                * @param {string} ecommEventName - GA Ecommerce event name.
                * @returns {string} VK pixel event name.
                */
                getEventName: function(ecommEventName) {
                    debug.log_start.call(this, 'vk.getEventName');
                    if (ecommEventName !== 'impressions') {
                        return this.eventsEcomm[ecommEventName];
                    }
                    else if (main.event.getPageType() === 'main') {
                        return this.eventsEcomm.impressions[0];
                    }
                    else if (main.event.getPageType() === 'catalog') {
                        return this.eventsEcomm.impressions[1];
                    }
                    else if (main.event.getPageType() === 'search') {
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
                    debug.log_start.call(this, 'vk.getEventParams');
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
                    debug.log_start.call(main.vk, 'vk.eventParamConstructor');
                    this.products = main.vk.getProductParams(ecommEventProducts);
                    this.category_ids = main.products.getCategoryString(ecommEventProducts);
                    this.currency_code = main.products.getCurrencyCode('vk', ecommEventCurrencyCode);
                    this.total_price = main.products.getTotalPrice(ecommEventProducts, ecommEventRevenue);
                    this.search_string = main.event.getSiteSearchPhrase();
                },
    
                /**
                * Getting the parameters of the product object for a pixel.
                * @param {Object[]} ecommEventProducts - An array of products and their parameters from the GA Ecommerce event.
                * @returns {Object[]} Product parameters.
                */
                getProductParams: function(ecommEventProducts) {
                    debug.log_start.call(this, 'vk.getProductParams');
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
                    debug.log_start.call(this, 'vk.getPriceListId');
                    if (settings.vk.fewPriceLists) {
                        return settings.vk.priceListIds[hostname];
                    }
                    else {
                        return settings.vk.priceListId;
                    }
                },
    
                /**
                * Openapi.js inject.
                */
                openapiInit: function() {
                    debug.log_start.call(this, 'vk.openapiInit');
                    if (document.getElementById('vk_api_transport')) {
                        debug.log.call(this, 'Failed to load openapi.js');
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
                    debug.log.call(this, 'Div with openapi.js was installed');
                },
    
                /**
                * VK pixel initialization.
                * @param {string} pixelID - VK pixel ID.
                */
                pixelInit: function(pixelID) {
                    debug.log_start.call(this, 'vk.pixelInit');
                    VK.Retargeting.Init(pixelID);
                    debug.log.call(this, 'Pixel was initialized:', pixelID);
                },

                /**
                * Sending pageview to VK pixel.
                */
                sendPageView: function() {
                    debug.log_start.call(this, 'vk.sendPageView');
                    if (window.VK) {
                        debug.log.call(this, 'Sending pageview to VK pixel...');
                        for (var i = 0; i < settings.vk.pixelIDs.length; i++) {
                            main.vk.pixelInit(settings.vk.pixelIDs[i]);
                            VK.Retargeting.Hit();
                            debug.log.call(main.vk, 'Pageview was sent to', settings.vk.pixelIDs[i]);
                        }
                    }
                    else if (document.getElementById('vk_api_transport') && main.vk.openapiLoadCounter < 100) {
                        debug.log.call(main.vk, 'VK not found, waiting for openapi.js load... Attempts left:', 99 - main.vk.openapiLoadCounter);
                        setTimeout(main.vk.sendPageView, 100);
                        main.vk.openapiLoadCounter++;
                    }
                    else {
                        debug.log.call(this, 'VK not found, trying to install openapi.js...');
                        this.openapiInit();
                        window.vkAsyncInit = function() {
                            debug.log.call(main.vk, 'vkAsyncInit: sending pageview to VK pixel...');
                            for (var i = 0; i < settings.vk.pixelIDs.length; i++) {
                                main.vk.pixelInit(settings.vk.pixelIDs[i]);
                                VK.Retargeting.Hit();
                                debug.log.call(main.vk, 'Pageview was sent to', settings.vk.pixelIDs[i]);
                            }
                        };
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
                    debug.log_start.call(main.vk, 'vk.sendEvent');
                    if (window.VK) {
                        debug.log.call(main.vk, 'Sending event data to VK pixel...');
                        var pixelEvent = new main.event.eventConstructor('vk', ecommEventName, ecommEventProducts, ecommEventCurrencyCode, ecommEventRevenue);
                        var priсeListID = main.vk.getPriceListId(main.url.host);
                        var name = pixelEvent.name;
                        var params = pixelEvent.params;
                        if (!settings.vk.pixelIDs) {
                            VK.Retargeting.ProductEvent(priсeListID, name, params);
                            debug.log.call(main.vk, 'Event data:', priсeListID, name, params, 'was sent to VK pixel');
                        }
                        else {
                            for (var i = 0; i < settings.vk.pixelIDs.length; i++) {
                                main.vk.pixelInit(settings.vk.pixelIDs[i]);
                                VK.Retargeting.ProductEvent(priсeListID, name, params);
                                debug.log.call(main.vk, 'Event data:', priсeListID, name, params, 'was sent to', settings.vk.pixelIDs[i]);
                            }
                        }
                    } 
                    else if (document.getElementById('vk_api_transport') && main.vk.openapiLoadCounter < 100) {
                            debug.log.call(main.vk, 'VK not found, waiting for openapi.js load... Attempts left:', 99 - main.vk.openapiLoadCounter);
                            setTimeout(main.vk.sendEvent, 100, ecommEventName, ecommEventProducts, ecommEventCurrencyCode, ecommEventRevenue);
                            main.vk.openapiLoadCounter++;
                    } 
                    else {
                        debug.log.call(main.vk, 'VK not found, event data cannot be sent to VK pixel');
                        return;
                    }
                }
            },
    
            facebook: {
                // Name of the object to display in the console when the debug mode is activated
                debugName: 'facebook',
            
                // Console output decoration when the debug mode is activated
                debugCSS: 'background-color: Plum;',
            
                // Matching GA Enhanced Ecommerce events and VK pixel events
                eventsEcomm: {
                    impressions: ['Search', 'ViewCategory'],
                    detail: 'ViewContent',
                    add: 'AddToCart',
                    remove: 'RemoveFromCart',
                    checkout: 'InitiateCheckout',
                    purchase: 'Purchase'
                },

                // метод проверки события на необходимость отправки данных в пиксель Facebook
                eventCheck: function(ecommEventName) {
                    debug.log_start.call(this, 'facebook.eventCheck');
                    if (ecommEventName === 'impressions' && !/search|catalog/.test(main.event.getPageType())) {
                        return false;
                    }
                    else {
                        return true;
                    }
                },
            },

            products: {
                // Name of the object to display in the console when the debug mode is activated
                debugName: 'products',

                /**
                * Getting a list of product categories.
                * @param {Object[]} ecommEventProducts - An array of products and their parameters from the GA Ecommerce event.
                * @returns {string} List of product categories.
                */
                getCategoryString: function(ecommEventProducts) {
                    debug.log_start.call(this, 'products.getCategoryString');
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
                    debug.log_start.call(this, 'products.getCurrencyCode');
                    if (!ecommEventCurrencyCode) {
                        return settings[pixel].defaultCurrency;
                    }
                    else {
                        return ecommEventCurrencyCode;
                    }
                },
    
                /**
                * Getting the total price of the products.
                * @param {Object[]} ecommEventProducts - An array of products and their parameters from the GA Ecommerce event.
                * @param {string} ecommEventCurrencyCode - Currency code from the GA Ecommerce event.
                * @returns {(integer|float)} Total price.
                */
                getTotalPrice: function(ecommEventProducts, ecommEventRevenue) {
                    debug.log_start.call(this, 'products.getTotalPrice');
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
                // Name of the object to display in the console when the debug mode is activated
                debugName: 'event',

                /**
                * Event validation for sending data in pixels.
                * @param {string} ecommEventName - GA Ecommerce event name.
                * @param {Object} ecommEventObj - GA Ecommerce object.
                * @returns {Object} Result of checking.
                */
                eventCheck: function(ecommEventName, ecommEventObj) {
                    debug.log_start.call(this, 'event.eventCheck');
                    var eventCheckedObj = {};
                    for (var pixel in settings.pixels) {
                        if (settings.pixels[pixel]) {
                            if (!main[pixel].eventsEcomm.hasOwnProperty(ecommEventName)) {
                                eventCheckedObj[pixel] = false;
                            }
                            else if (ecommEventName === 'checkout' && parseInt(ecommEventObj.actionField.step, 10) !== 1) {
                                eventCheckedObj[pixel] = false;
                            }
                            else if (main[pixel].hasOwnProperty('eventCheck') && !main[pixel].eventCheck(ecommEventName, ecommEventObj)) {
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
                    debug.log_start.call(main.event, 'event.eventConstructor');
                    this.name = main[pixel].getEventName(ecommEventName);
                    this.params = main[pixel].getEventParams(ecommEventProducts, ecommEventCurrencyCode, ecommEventRevenue, ecommEventName);
                },
    
                /**
                * Page type definition.
                * @returns {string} Page type.
                */
                getPageType: function() {
                    debug.log_start.call(this, 'event.getPageType');
                    if (settings.useGTMvarPageType) {
                        if (settings.pageTypeGTM === settings.pageTypeGTMnames.main) {
                            debug.log.call(this, 'Page type found by GTM variable: main');
                            return 'main';
                        }
                        else if (settings.pageTypeGTMnames.catalog && settings.pageTypeGTMnames.catalog.indexOf(settings.pageTypeGTM) !== -1) {
                            debug.log.call(this, 'Page type found by GTM variable: catalog');
                            return 'catalog';
                        }
                        if (settings.pageTypeGTM === settings.siteSearchPage) {
                            debug.log.call(this, 'Page type found by GTM variable: search');
                            return 'search';
                        }
                        else {
                            debug.log.call(this, 'Page type found by GTM variable: other');
                            return 'other';
                        }
                    }
                    else {
                        if (settings.mainPage && main.url.href.match(settings.mainPage) !== null) {
                            debug.log.call(this, 'Page type: main');
                            return 'main';
                        }
                        else if (settings.catalogPage && main.url.href.match(settings.catalogPage) !== null) {
                            debug.log.call(this, 'Page type: catalog');
                            return 'catalog';
                        }
                        else if (settings.siteSearchPage && main.url.href.match(settings.siteSearchPage) !== null) {
                            debug.log.call(this, 'Page type: search');
                            return 'search';
                        }
                        else {
                            debug.log.call(this, 'Page type: other');
                            return 'other';
                        }
                    }
                },
    
                /**
                * Getting a site search query.
                * @returns {string} Search query.
                */
                getSiteSearchPhrase: function() {
                    debug.log_start.call(this, 'event.getSiteSearchPhrase');
                    if (settings.siteSearchQueryParam && this.getPageType() === 'search') {
                        var query = main.url.search.substring(1);
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
                        debug.log.call(this, 'Site search query:', queryString[settings.siteSearchQueryParam]);
                        return queryString[settings.siteSearchQueryParam];
                    }
                    else {
                        debug.log.call(this, 'Site search query not found');
                    }
                }
            },
    
            // Page URL parameters
            url: {
                host: window.location.hostname,
                search: window.location.search,
                href: window.location.href
            },
    
            // Name of the object to display in the console when the debug mode is activated
            debugName: 'system',
    
            /**
            * Run tag first time.
            */
            firstStart: function() {
                debug.log_start.call(this, 'firstStart');
                for (var pixel in settings.pixels) {
                    if (settings.pixels[pixel] && settings[pixel].baseCode) {
                        main[pixel].sendPageView();
                    }
                }
                if (window.dataLayer) {
                    for (var i = 0;  i < dataLayer.length; i++) {
                        if (!dataLayer[i].hasOwnProperty('ecommerce')) {
                            debug.log.call(this, 'There is no ecommerce in dataLayer event');
                            continue;
                        }
                        debug.log.call(this, 'Ecommerce found, start processing...');
                        var ecommEventCurrencyCode = dataLayer[i].ecommerce.currencyCode;
                        for (var property in dataLayer[i].ecommerce) {
                            debug.log.call(this, 'Start processing ecommerce event', property);
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
                            debug.log.call(this, 'Start validate ecommerce event', property);
                            var eventCheckedObj = main.event.eventCheck(property, dataLayer[i].ecommerce[property]);
                            for (var checkedPixel in eventCheckedObj) {
                                if (eventCheckedObj[checkedPixel]) {
                                    debug.log.call(this, 'Ecommerce event', property, 'has passed validation for', checkedPixel, ', start sending data...');
                                    main[checkedPixel].sendEvent(property, products, ecommEventCurrencyCode, revenue);
                                } 
                                else {
                                    debug.log.call(this, 'Ecommerce event', property, 'failed validation for', checkedPixel);
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
                debug.log.call(this, 'Setting dataLayer.push listener...');
                dataLayer.push = function() {
                    debug.log.call(main, 'DataLayer.push was intercepted');
                    originalPush.apply(this, arguments);
                    debug.log.call(main, 'Original dataLayer.push has been sent');
                    if (!arguments[0].hasOwnProperty('ecommerce')) {
                        debug.log.call(main, 'No ecommerce events were found in the intercepted dataLayer.push');
                        return;
                    } 
                    else {
                        main.otherStart(arguments[0]);
                    }
                };
            },
    
            /**
            * Run tag after dataLayer.push intercepting.
            * @param {Object} dataLayerPushArg - Original dataLayer.push argument.
            */
            otherStart: function(dataLayerPushArg) {
                debug.log_start.call(this, 'otherStart');
                var ecommEventCurrencyCode = dataLayerPushArg.ecommerce.currencyCode;
                for (var property in dataLayerPushArg.ecommerce) {
                    debug.log.call(this, 'Start processing dataLayer.push ecommerce event', property);
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
                    debug.log.call(this, 'Start validate dataLayer.push ecommerce event', property);
                    var eventCheckedObj = main.event.eventCheck(property, dataLayerPushArg.ecommerce[property]);
                    for (var checkedPixel in eventCheckedObj) {
                        if (eventCheckedObj[checkedPixel]) {
                            debug.log.call(this, 'DataLayer.push ecommerce event', property, 'has passed validation for', checkedPixel, ', start sending data...');
                            main[checkedPixel].sendEvent(property, products, ecommEventCurrencyCode, revenue);
                        } 
                        else {
                            debug.log.call(this, 'DataLayer.push ecommerce event', property, 'failed validation for', checkedPixel);
                        }
                    }
                }
            }
        };    
    
        var debug = {
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
                if (settings.debug && /was sent to/.test(argArr.join(' '))) {
                    console.log('[gaEcomTransfer]%c[' + this.debugName + ' *SEND*]', this.debugCSS + 'font-weight: bold;', argArr.join(' '));
                }
                else if (settings.debug && /failed validation for/.test(argArr.join(' '))) {
                    console.log('[gaEcomTransfer]%c[' + this.debugName + ']', 'background-color: LightCoral;', argArr.join(' '));
                }
                else if (settings.debug && /(Ecommerce found)|(has passed validation for)|(Start processing.*ecommerce event)/.test(argArr.join(' '))) {
                    console.log('[gaEcomTransfer]%c[' + this.debugName + ']', 'background-color: PaleGreen;', argArr.join(' '));
                }
                else if (settings.debug) {
                    console.log('[gaEcomTransfer]%c[' + this.debugName + ']', this.debugCSS, argArr.join(' '));
                }
            },
    
            /**
            * Сonsole logging at method starts when the debug mode is activated
            */
            log_start: function(methodPath) {
                if (settings.debug) {
                    console.log('[gaEcomTransfer]%c[' + this.debugName + ']', this.debugCSS, 'Start main.' + methodPath + '()');
                }
            },
        };    
    
        // Start
        try {
            if (!settings) {
                debug.log.call(main, 'Settings not found, exit...');
                return;
            }
            else {
                main.firstStart();
                if (window.dataLayer) {
                    main.setDataLayerPushListener(dataLayer.push);
                }
                else {
                    debug.log.call(main, 'DataLayer not found, can’t install dataLayer.push listener');
                }
            }
        } 
        catch(e) {
            console.log('[gaEcomTransfer] UNKNOWN ERROR');
        }
    };     
})();    