var mediator, assign, APILib, courier, view; 


var assign = (function() {
  var text = '',
  lang = 'en-ru', // направление перевода
  ui = 'ru', //
  flags = 0x000c;
  function getParams() {
    return {
      text : text,
      lang : lang,
      ui : ui,
      flags : flags
    }
  }
  function setText(txt) {
    text = txt.trim();
  }
  function setLang(lg) {
    lang = lg;
  }
  function isOneWord() {
    return !(~text.indexOf(' ')); //
  }
  function toString() {
    return text + 'lang=' + lang;
  }
  return {
    isOneWord : isOneWord,
    setText : setText,
    setLang : setLang,
    getParams : getParams,
    toString : toString
  }
})() 


var APILib = (function() {
  
  var yandexDictionaryAPI, yandexInterpreterAPI;
  
  
  
  yandexDictionaryAPI = {
    //https://tech.yandex.ru/dictionary/doc/dg/reference/lookup-docpage/
    
    path : 'https://dictionary.yandex.net/api/v1/dicservice.json/lookup?',
    /* каждый ключ имеет ограниченную квоту на количество переводов 
    за определенный период времени,
    больше ключей - больше раз можно воспользоваться API, меняя ключи
    */
    keys : [
      'dict.1.1.20161211T013101Z.4d434f548d2c6487.a0240ec240306be47446e646978bbb2c0f6ed6de'
    ],
    errorsRequest : {
        401 : ['Ключ API невалиден. '],
        402 : ['Ключ API заблокирован. '],
        403 : ['Превышено суточное ограничение на количество запросов.'],
        413 : ['Превышен максимальный размер текста.',true],
        501 : ['Заданное направление перевода не поддерживается.']
    },
    label : '«Реализовано с помощью сервиса ' +
      '<a href=\'https://tech.yandex.ru/dictionary/\'>«Яндекс.Словарь»</a>',
    reformateResponse : function(responseObject) {
      responseObject = JSON.parse(responseObject);
      var def,result = [];
      for(var i = 0; i < responseObject.def.length; i++) {
        def = {
          formOfWord : responseObject.def[i].text,
          partOfSpeach : responseObject.def[i].pos,
          variants: []
        };
        for(var j = 0; j < responseObject.def[i].tr.length; j++) {
          def.variants.push(responseObject.def[i].tr[j].text);
        }
        result.push(def);
      }
      return result;
    },
    /*getPath : getPath,
    getKey : getKey,*/
    getLabel : getLabel,
    getCache : getCache,
    addToCache : addToCache,
    findInCache : findInCache,
    cache : {},
    getUrl: getUrl
  };
  yandexInterpreterAPI = {
    path : 'https://translate.yandex.net/api/v1.5/tr.json/translate?',
    keys : [
      'trnsl.1.1.20161211T003418Z.db5d3b30556edece.4057f1957d715db135b319a576dea6b5c2a6f198'
    ],
    errorsRequest : {
        401 : ['Неправильный API-ключ '],
        402 : ['Ключ API заблокирован. '],
        404 : ['Превышено суточное ограничение на объем переведенного текста.'],
        413 : ['Превышен максимальный размер текста.',true],
        422 : ['Текст не может быть переведен.'],
        501 : ['Заданное направление перевода не поддерживается.']
    },
    label : '«Переведено сервисом ' + 
    '<a href=\'http://translate.yandex.ru/\'>«Яндекс.Переводчик»</a>',
    reformateResponse : function(responseObject) {
      responseObject = JSON.parse(responseObject);
      //console.dir(responseObject.text[0])
      return responseObject.text[0];
    },
    /*getPath : getPath,
    getKey : getKey,*/
    getLabel : getLabel,
    getCache : getCache,
    addToCache : addToCache,
    findInCache : findInCache,
    cache : {},
    getUrl: getUrl
  }
  function getLabel() {
    return this.label;
  }
  function getUrl() {
    return this.path + 'key=' + this.keys[0] + '&';
  }
  /*function getPath() {
    return this.path;
  }
  function getKey() {
    return this.keys[0];
  }*/
  /*function translate(path, key, params) {
    var result;
    if( result = findInCache(params) ) {
      mediator.translateCompleted(result);
    } else {
     // generateUrl(path, key, params);
      request(path, key, params);
    }
  }*/
  function addToCache(params, result) {
     //console.dir(this.cache) 
    this.cache[params.toString()] = result;
  }
  function findInCache(params) {
    /*if (!translator.cache) {
      translator.cache = {};
    }*/
   //console.log(params)  
    /*var result;
    if (result = this.cache[params.toString()]) {
      mediator.translateCompleted(result);
    } else {
      mediator.request();
    }*/
    //console.dir(this.cache)  ;
    return this.cache[params.toString()];
  }
  function getCache() {
    return this.cache;
  }
    
  return {
    selectAPI : function(API) {
      switch (API) { 
      case 'YD': return yandexDictionaryAPI;
        //break;
      case 'YI': return yandexInterpreterAPI;
       // break;
      }
    }
  }
})();
  
var courier = (function() {
  function requestGET(url, params, resolve, reject) {
    var xhr;
    //url = generateUrl(path, key, params);
    //url = urlCreator.addPath(path).addKey(key).addParams(params).getUrl();
    //console.dir(new URL);
    //url = (new URL).addPath(path).addKey(key).addParams(params).getUrl();
    if ((typeof params) === 'object') {
      for (var prop in params) {
         url +=  prop + '=' + encodeURIComponent(params[prop]) + '&';
      }
    }
    xhr = new XMLHttpRequest();
    xhr.open('GET', url );
    xhr.send();
    xhr.onload = function() {
      if (this.status === 200) {
        resolve(this.responseText);
      } else {
        var err = new ErrorRequest();
        err.code = this.status;
        err.url = url;
        reject(err);
      }
    }
    xhr.onerror = function(err) {
      err.code = this.status;
      err.url = url;
      mediator.errorRequestDetected(err)
    }
  }

  return {
    requestGET : requestGET
  }
})();
/*var urlCreator = (function() {
  return {
    addParams: function(url, params) {
      for (var prop in params) {
        paramsString +=  prop + '=' + encodeURIComponent(params[prop]) + '&';
      }
      return url += paramsString;
    }
  }
})()*/

/*var urlCreator = (function() {
  var url;
  function addPath(path) {
    url += path;
    return this;
  }
  function addParams(params) {
    if ( !url || !(/?/.test(url)) ) {
      mediator.errorDetected( new Error('Неверный url path: ' + url) );
    }
    for (var prop in params) {
      paramsString +=  prop + '=' + encodeURIComponent(params[prop]) + '&';
    }
    url += paramsString;
    return this;
  }
  function getUrl() {
    return url;
  }
  return {
    addPath: addPath,
    addParams: addParams,
    getUrl: getUrl
  }
})();*/
var mediator = (function() {
  var API; //одно из APILib
  
  function start() {
    //инициализация букмарклета(добавление HTML, стилей, обработчиков событий)
    view.init();
  }
  function gotAssign(text) {
    var result;
    assign.setText(text);
    if ( assign.isOneWord() ) {
      API = APILib.selectAPI('YD'); //YD - yandexDictionary - словарь, много вариантов перевода
    } else {
      API = APILib.selectAPI('YI') //YI - yandexInterpreter - переводчик, 1 вариант перевода
    }
    if ( result = API.findInCache( assign.toString() ) ) {
      //console.dir( assign.toString() );
      this.translateCompleted(result);
    } else {
      this.request(API.getUrl(), assign.getParams(),
                   this.gotResponse, this.errorRequestDetected);
    }
  }
  function request(url, params, resolve, reject) {
    courier.requestGET(url, params, resolve, reject);
  }
  function gotResponse(response) {
   // console.dir(response);

    var result;
    result = API.reformateResponse(response);
    //console.dir(this);
    //this.translateCompleted(result);
    mediator.translateCompleted(result);/////////////////////////////////Ошибка - потерян контекст this,
  }
  function translateCompleted(result) {
    if (result.length > 0) {// Если есть какой-то результат перевода
      /*Выбор шаблона представления результата.
        Связан с выбором API. API Яндекс-словаря возвращает несколько вариантов перевода,
        а API Яндекс-переводчика только 1 вариант*/
      if ( assign.isOneWord() ) {
        view.selectTemplate('list')
      } else {
        view.selectTemplate('string')
      }
      view.reloadResultBlock( result );
      view.reloadLabelBlock( API.getLabel() );
      API.addToCache(assign.toString(), result);
    } else {
      view.selectTemplate('notice');
      view.reloadResultBlock( 'Не найдено ни одного варианта перевода текста: <mark>' + 
        assign.getParams().text +
        '</mark>. Возможно, следует поменять направление перевода' );
    }
  }
  
  function errorRequestDetected(err) {
    if ( API.errorsRequest[err.code] ) {
      err.message += ' ' + API.errorsRequest[err.code][0];
      err.tellTheUser = API.errorsRequest[err.code][1];
    }
    this.errorDetected(err)
  }
  function errorDetected(err) {
    if (err.tellTheUser) {
      view.selectTemplate('YI');///////////
      view.reloadResultBlock( result );
      view.showWidget();
    } else {
      //console.info(err);
      console.error(err);
    }
  }
  function stop() { //отключение букмарклета
    view.stop();
  }
  
  return {
    start : start,
    gotAssign : gotAssign,
    request : request,
    gotResponse : gotResponse,
    translateCompleted : translateCompleted,
    stop : stop,
    errorRequestDetected : errorRequestDetected,
    errorDetected : errorDetected
  }
  
})();








var view = (function() {
  var HTML, eventHandler,
  prefix = 'pfx12sd43pfx';/*Префикс, автоматически добавляется
      ко всем id в HTML-разметке букмарклета*/
  function getById(id, prefix) {
    prefix = prefix || '';
    return document.getElementById(prefix + id);
  }
  function append(element) {
    document.body.appendChild(element);
  }
  function remove(element) {
    element.parentNode.removeChild(element);
  }
  
  function getByClassWithPrefix(className, pfx) {
    if (!pfx) {
      var pfx = prefix;
    }
    //console.log(className)
    var result;
    className = className.trim();
    className = '.' + pfx + className; // Добавление префикса к первому классу
    className = className.replace(/\s+/g, ' .'+pfx);//Добавление префиксов к остальных классам, если они есть
    result = document.querySelector(className)
    if ( !(result instanceof Node) ) {
      return result;
    } else {
      var err = new Error('результат поиска ' + className +' - не DOM-элемент');
      mediator.errorDetected(err);
    }
  }
  HTML = (function() {
    /*
      CSS
      В файл bootstrap.css внесены изменения:
      1. К именам всех классов добавлен префикс
        для исключения возможности возникновения конфликта со стилями сайта
        (При использовании SASS для добавления префикса нужно исправить ошибку в правиле @font-face)
      2. Добавлен класс nav-tabs-left основанный на классе nav-tabs
    */
    var widget, //HTMLElement - корневой элемент букмарклета
      resultBlock, //HTMLElement - контейнер для результата перевода
      labelBlock, //HTMLElement - контейнер для label(информация обязательная к показу по условиям использования API)
      builderResultBlock, // функция преобразования рез-та в HTML
      widgetInnerHTML = '';//строка - HTML содержимое виджета
      
    widgetInnerHTML = 
    '<div class="container-fluid">' +
      '<div class="row bg-primary">' +
        '<div class="col-xs-6">' +
          '<select id="selectLang" class="form-control input-sm">'+
            '<option selected="" value="en-ru">Английский - Русский</option>'+
            '<option value="ru-en">Русский - Английский</option>'+
           ' <option value="ru-ru">Русский - Русский</option>'+
          '</select>'+
       ' </div>'+
        '<div id="toggleButton"  class=" col-xs-1 col-xs-offset-4 btn btn-default btn-sm">'+
          '<span class="glyphicon glyphicon-minus" aria-hidden="true"></span>'+
        '</div>'+
        '<div id="closeButton" class="col-xs-1 btn btn-default btn-sm">'+
          '<span class="glyphicon glyphicon-off" aria-hidden="true"></span>'+
        '</div>'+
      '</div>'+
      '<div id="workSpace" class="show">'+
        '<div id="resultBlock" class="row">'+
          '<div class="col-xs-12">'+
            '<h4 class="text-info text-center">Выделите текст мышкой или воспользуйтесь формой</h4>'+
            '</div>'+
        '</div>'+
        '<div id="labelBlock" class="row">'+
        '</div>'+
       ' <form id="searchForm" class="form-horizontal">'+
         ' <div class="form-group">'+
            '<div class="col-xs-10">'+
              '<textarea id="searchInput" class="form-control input-sm"></textarea>'+
            '</div>'+
            '<div class="col-xs-2">'+
              '<button id="searchButton" class="btn btn-default btn-block btn-lg">'+
                '<span class="glyphicon glyphicon-search" aria-hidden="true"></span>'+
              '</button>'+
            '</div>'+
          '</div>'+
        '</form>'+
      '</div>'+
    '</div>';
    function createWidget() {
      widget = document.createElement('div');
      widget.id = 'bookmarklet';
      widget.innerHTML = widgetInnerHTML;
    }
    /*При первом вызове функции ссылка на DOM-элемент 
    (контейнер для результата) записывается в переменную(resultBlock),
    затем функция переопределяет сама себя,
    и при след. вызове будет работать с уже найденным элементом через замыкание*/
    function reloadResultBlock(/*string HTML*/ result) {
      //console.log(result)
      resultBlock = getById('resultBlock', prefix);
      reloadResultBlock = function(result) {
        var htmlResult = builderResultBlock(result);
        resultBlock.innerHTML = htmlResult;
      }
      reloadResultBlock(result);
    }
    function reloadLabelBlock(/*string HTML*/ label) {
      labelBlock = getById('labelBlock', prefix);
      reloadLabelBlock = function() {
        labelBlock.innerHTML = `<p class='text-center'>${label}</p>`;
      }
      reloadLabelBlock(label);
    }
    
    function result2Table(resultTranslate,pfx) {
      if (!pfx) {
        pfx = prefix;
      }
      var html = tHeadContent = tBodyContent = '';
      (function() {
        for(var i = 0; i < resultTranslate.length; i++) {
          tHeadContent +=   
                '<th>' +
                  resultTranslate[i].formOfWord +
                  '</br>' +
                  '<span class=' +pfx + 'PartOfSpeach>' +
                    resultTranslate[i].partOfSpeach +
                  '</span>' +
                '</th>';
          arr = resultTranslate[i].variants;
          tBodyContent += '<td><ul>';
          for(var j = 0; j < arr.length; j++) {
            tBodyContent += '<li>' +arr[j] + '</li>';
          }
          tBodyContent += '</ul></td>';
        }
      })();
          
      html =
        '<div>' +
          '<table>' +
            '<thead>' +
              '<tr>' + tHeadContent +
              '</tr>' +
            '</thead>' +
            '<tbody>' +
              '<tr>' + tBodyContent +
              '</tr>' +
            '</tbody>' +
          '</table>' +
        '</div>';
      return html;
    }

    function result2List(resultTranslate) {
      //итоговая HTML строка которая будет встраиваться в блок представления результата
      var html =  
      nav = // часть html, будет содержать bootstrap Nav tabs 
      tabContent = ''; // часть html, будет содержать bootstrap Tab panes
      //самовызывающаяся ф-ия нужна только для наглядности, в ней формируются nav и tabContent
      (function() {
        //эти переменные активируют первый элемент результата и переопределяться в пустую строку
        var activeClass = " active ", inClass = " in ";
        nav += '<ul id="#' 
          + prefix + 'navVariants" class="nav nav-tabs-left nav-stacked" role="tablist">';
        tabContent += '<div class="tab-content">';
        for(var i = 0; i < resultTranslate.length; i++) {
          nav +=   
            '<li role="presentation" class="' + activeClass + '">'+
              '<a href=#'
                + prefix + i + //уникальный идентификатор, чтобы избежать конфлитка со страницей
                '" aria-controls="home" role="tab" data-toggle="tab">' +
                resultTranslate[i].formOfWord +
                '</br><em>(' + resultTranslate[i].partOfSpeach +')</em>'+
              '</a>'+
            '</li>';
            
          arr = resultTranslate[i].variants;
          tabContent  += 
          '<div role="tabpanel" class="tab-pane well' + activeClass + inClass + '" id="'
            + prefix + i +
            '"><ul class="list-unstyled">';
          for(var j = 0; j < arr.length; j++) {
            tabContent += '<li>' +arr[j] + '</li>';
          }
          tabContent += '</ul></div>';
          //эти классы добавляются только для первого элемента, чтобы активизировать его
          activeClass = inClass = '';
        }
        nav += '</ul>';
        tabContent += '</div>';
      })();
          
      html =
          '<div class="col-xs-6">' +
            nav +
          '</div>' +
          '<div class="col-xs-6">' +
            tabContent +
          '</div>';
      return html;
    }
    function result2Sentence(result) {
      return '<div class="col-xs-12"><p class="well">' + result + '</p></div>';
    }
    function showNotice(text) {
      return '<div class="col-xs-12"><p class="text-danger text-center">' + text + '</p></div>';
    }
    /*Добавление префикса ко всем id в HTML-разметке букмарклета*/
    function addPrefixes(prefix) {
      // добавление префикса к id кореневого элемента
      widget.id = addPrefixe2Id(widget.id, prefix);
      //console.log(widget.classList);
      // добавление префикса к cодержимоve кореневого элемента
      var widgetDescendants = widget.getElementsByTagName('*');
      //console.log(widgetDescendants[4].classList);
      for (var i = 0; i < widgetDescendants.length; i++) {
        if (widgetDescendants[i].id) {
          widgetDescendants[i].id =
          addPrefixe2Id(widgetDescendants[i].id, prefix);
        }
      }
    }
    // Добавление префикса
    function addPrefixe2Id(id, prefix){
      id = id.trim();
      id = prefix + id;
      return id;
    }
    
    return {
      getWidget: function() {
        if (!widget) {
          createWidget();
        }
        return widget;
      },
      getResultBlock: function() {
        return resultBlock;
      },
      selectTemplate: function(template) {
        switch (template) { 
        case 'table': builderResultBlock = result2Table;
          break;
        case 'string': builderResultBlock = result2Sentence;
          break;
        case 'list': builderResultBlock = result2List;
          break;
        case 'notice': builderResultBlock = showNotice;
          break;
        }
      },
      reloadResultBlock: reloadResultBlock,
      reloadLabelBlock: reloadLabelBlock,
      addPrefixes: addPrefixes,
      createWidget: createWidget
    }
  })();
 
  eventHandler = (function() {
    var widget, listeners = [];
    
    
    function toggleVariantsTranslate(event) {
      var target = event.target,
      descendants,
      length;
      //selectedNav, selectedContent, 
      // цикл двигается вверх от target к родителям до table
      while (target != this) {
        
        if (target.tagName.toLowerCase() == 'a') {
          // нашли элемент, который нас интересует!
          descendants = HTML.getResultBlock().getElementsByTagName('*');
          length = descendants.length;
          for (var i = 0; i < length; i++) {
            if ( descendants[i].classList.contains('active') ) {
              descendants[i].classList.remove('active');
            }
            if ( descendants[i].classList.contains('in') ) {
              descendants[i].classList.remove('in');
            }
          }
          selectVariantTranslate(target)
          return;
        }
        target = target.parentNode;
      }
     
    }
   /* function unselectVariantTranslate(a) {
      var selectedNav, selectedContent;
      selectedNav = a.parentNode;
      selectedContent = document.getElementById(a.getAttribute('href').slice(1, -1));
      selectedNav.classList.remove('active');
      selectedContent.classList.remove('in');
      selectedContent.classList.remove('active');
    }*/
    function selectVariantTranslate(a) {
      var selectedNav, selectedContent;
      selectedNav = a.parentNode;
      selectedContent = document.getElementById(a.getAttribute('href').slice(1, -1));
      selectedNav.classList.add('active');
      selectedContent.classList.add('in');
      selectedContent.classList.add('active');
    }
    
    /*Здесь хранятся данные о событиях, 
    некоторые данные генерируются динамически,
    поэтому приходится хранить события в функции и вызывать только когда виджет создан*/
    function createListenersDescription() {
      widget = HTML.getWidget();
      listeners = [
      /*Функции обратного вызова будут оперировать уже готовы виджетом,
      так что если при создании виджета были добавлены префиксы к именам классов
      - это нужно учитывать и в Функциях обратного вызова,
      функция getByClassWithPrefix поможет получить нужный элемент с учетом префиксов*/
        { /* Получение выделенного текста*/
          DOMElement: document.body, 
          eventType: 'mouseup',
          callback: function(e){
            /*событие не распространяется на содержимое самого виджета
            (выделенный текст не будет автоматически переведен)*/
            //console.log(widget);
            //console.log(e.target);
            //console.log(widget.contains(e.target));
            if (widget.contains(e.target)) {
              return;
            }
            var selectedText = window.getSelection().toString();
            if(selectedText){ //если какой-то текст выделен пользователем
              mediator.gotAssign( selectedText );
            }
          }
        },
        {
          DOMElement: document.body,
          eventType: 'mousedown',
          callback: function(event){
            if( window.getSelection().toString() && (event.which === 1) ){ //
              window.getSelection().removeAllRanges();
            }
          }
        },
        {
          DOMElement: getById('toggleButton', prefix),
          eventType: 'click',
          callback: toggleWidget
        },
        {
          DOMElement: getById('closeButton', prefix),
          eventType: 'click',
          callback: mediator.stop
        },
        {
          DOMElement: getById('searchButton', prefix),
          eventType: 'click',
          callback: function(e){
            e.preventDefault();
            var text = getById('searchInput', prefix).value;
            //console.log(text);
            mediator.gotAssign(text);
          }
        },
        {
          DOMElement: getById('selectLang', prefix),
          eventType: 'click',
          callback: function(event){
            //////////////////////////////////////
            assign.setLang(event.target.value);
          }
        },
        {
          DOMElement: getById('resultBlock', prefix),
          eventType: 'click',
          callback: toggleVariantsTranslate
        }
      ];
    }
    
    
    ///////функции изменяющие состояние виджета
    
    /*function showWidget() {
      widget.classList.remove(prefix + 'Close');
      widget.classList.add(prefix + 'Open');
      getByClassWithPrefix('WorkSpace', prefix).classList.add(prefix + 'Open');
    }*/
    /*function toggleWidget() {
      //getById('workSpace', prefix).classList;
      
      } else {
        workSpace.classList.remove(prefix + 'Close');
        workSpace.classList.add(prefix + 'Open');
        toggleButton.classList.remove(prefix + 'arrowDown');
        toggleButton.classList.add(prefix + 'arrowUp');
      }
    }*/
    
    /*function toggleVariantsTranslate(event) {
      var a, target = event.target;
      //selectedNav, selectedContent, 
      // цикл двигается вверх от target к родителям до table
      while (target != this) {
        
        if (target.tagName.toLowerCase() == 'a') {
          // нашли элемент, который нас интересует!
          console.log(a)
          if (a) {
            unselectVariantTranslate(a);
          }
          a = target;
          selectVariantTranslate(a)
          return;
        }
        target = target.parentNode;
      }
     
    }
    function unselectVariantTranslate(a) {
      var selectedNav, selectedContent;
      selectedNav = a.parentNode;
      selectedContent = document.getElementById(a.getAttribute('href').slice(1, -1));
      selectedNav.classList.remove('active');
      selectedContent.classList.remove('in');
      selectedContent.classList.remove('active');
    }
    function selectVariantTranslate(a) {
      var selectedNav, selectedContent;
      selectedNav = a.parentNode;
      selectedContent = document.getElementById(a.getAttribute('href').slice(1, -1));
      selectedNav.classList.add('active');
      selectedContent.classList.add('in');
      selectedContent.classList.add('active');
    }*/
    function toggleWidget() {
      var workSpace = getById('workSpace', prefix);
      if ( workSpace.classList.contains('show')) {
        hideElement(workSpace);
      } else  {
        showElement(workSpace);
      }
    }
    
    function hideElement(element) {
      //console.log(widget)
      element.classList.remove('show');
      element.classList.add('hidden');
    }
    function showElement(element) {
      //console.log(widget)
      element.classList.remove('hidden');
      element.classList.add('show');
    }
    ///////////
    
    function addListener(DOMElement, eventType, callback) {
      //console.log(DOMElement, eventType, callback);
      if (!(DOMElement instanceof Node) ) {
        var err = new Error(DOMElement + 'не DOM-элемент');
        mediator.errorDetected(err);
      }
      //if (DOMElement.addEventListener) {
        DOMElement.addEventListener(eventType, callback);
      //} else {
      //  DOMElement.attachEvent('on' + eventType, callback)
      //}
    }
    function removeListener(DOMElement, eventType, callback) {
      if (!(DOMElement instanceof Node) ) {
        var err = new Error(DOMElement + 'не DOM-элемент');
        mediator.errorDetected(err);
      }
      DOMElement.removeEventListener(eventType, callback);
    }
    
    function addListeners() {
      //console.log(listeners);
      listeners.forEach( function(listener) {
          addListener(listener.DOMElement, listener.eventType, listener.callback);
        }
      );
    }
    function removeListeners() {
      listeners.forEach( function(listener) {
          removeListener(listener.DOMElement, listener.eventType, listener.callback);
        }
      );
    }
    
    return {
      run: function() {
        createListenersDescription();
        addListeners();
      },
      stop: removeListeners
    }
  })()
  
  
  
  function init() {
    HTML.createWidget();
    HTML.addPrefixes(prefix);
    append(HTML.getWidget());
    //console.log(HTML.getWidget())
    //widget = getById();
    eventHandler.run();
  }
  function stop() {
    eventHandler.stop();
    remove(HTML.getWidget());
    //remove(getById('bookmarkletStylesheet', prefix))
  }
  return {
    init: init,
    stop: stop,
    selectTemplate: HTML.selectTemplate,
    reloadResultBlock: HTML.reloadResultBlock,
    reloadLabelBlock: HTML.reloadLabelBlock
  }
})();

mediator.start();