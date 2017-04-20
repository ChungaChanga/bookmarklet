'use strict';
/*Основные объекты*/
var mediator,/*Инкапсулирует взаимодействие всех основных объектов - посредник*/
 task,/*Задание (перевести такой-то текст с такими-то параметрами)*/
 APILib,/*Библиотека API, позволяет выбрать конкретный API*/
 courier,/*для обращения к словарю/переводчику (в данном случае это API)*/
 view; /*HTML, обработка событий пользователя*/
 
/*Задание (перевести текст(полученный от пользователя) со следующими параметрами))*/
task = (function() {
  /*Параметры получаемые от пользователя*/
  var text = '',
  /*Предопределенные параметры*/
  lang = 'en-ru', // направление перевода
  ui = 'ru', //
  flags = 0x000c;//см. документацию API
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

APILib = (function() {
  
  var yandexDictionaryAPI, yandexInterpreterAPI;
  
  
  
  yandexDictionaryAPI = {
    //https://tech.yandex.ru/dictionary/doc/dg/reference/lookup-docpage/
    
    path : 'https://dictionary.yandex.net/api/v1/dicservice.json/lookup?',
    keys : [
      'dict.1.1.20161211T013101Z.4d434f548d2c6487.a0240ec240306be47446e646978bbb2c0f6ed6de'
    ],
    /*Коды возможных ошибок возвращаемых API, и их расшифровка*/
    errorsRequest : {
        401 : ['Ключ API невалиден. '],
        402 : ['Ключ API заблокирован. '],
        403 : ['Превышено суточное ограничение на количество запросов.'],
        413 : ['Превышен максимальный размер текста.',true],
        501 : ['Заданное направление перевода не поддерживается.']
    },
    /*Информация обязательная к показу по условиям использования API*/
    label : '«Реализовано с помощью сервиса ' +
      '<a href=\'https://tech.yandex.ru/dictionary/\'>«Яндекс.Словарь»</a>',
    /*Преобразование данных полученных от API к единой внутренней структуре хранения данных*/
    reformateResponse : function(/*Ответ API*/responseObject) {
      responseObject = JSON.parse(responseObject);
      var def,
      result = [];//
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
    cache : {},//кэш 
    /*Общие методы*/
    getLabel : getLabel,
    getCache : getCache,
    addToCache : addToCache,
    findInCache : findInCache,
    getUrl: getUrl
  };
  yandexInterpreterAPI = {
    /* https://tech.yandex.ru/translate/ */
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
      return responseObject.text[0];
    },
    getLabel : getLabel,
    getCache : getCache,
    addToCache : addToCache,
    findInCache : findInCache,
    cache : {},
    getUrl: getUrl
  }
  /*Общие методы*/
  function getLabel() {
    return this.label;
  }
  function getUrl() {
    return this.path + 'key=' + this.keys[0] + '&';
  }
  function addToCache(params, result) {
     //console.dir(this.cache) 
    this.cache[params.toString()] = result;
  }
  function findInCache(params) {
    return this.cache[params.toString()];
  }
  function getCache() {
    return this.cache;
  }
    
  return {
    selectAPI : function(API) {// Выбор API
      switch (API) { 
      case 'YD': return yandexDictionaryAPI;
      case 'YI': return yandexInterpreterAPI;
      }
    }
  }
})();
  
var courier = (function() {
  function requestGET(url, params, /*callback*/resolve, /*callback*/reject) {
    var xhr;
    /*Добавление параметров GET запроса*/
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
      reject(err)
    }
  }

  return {
    requestGET : requestGET
  }
})();


var view = (function() {
  var HTML, eventHandler,
  prefix = 'pfx12sd43pfx';/*Префикс, автоматически добавляется
      ко всем id в HTML-разметке букмарклета*/
      
  function init() {
    HTML.createWidget();
    HTML.addPrefixes(prefix);
    append(HTML.getWidget());
    eventHandler.run();
  }
  function stop() {
    eventHandler.stop();
    remove(HTML.getWidget());
  }
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
  
  /*
    CSS построен на использовании bootstrap.
    Код подключающий bootstrap расположен в самой закладке - в псевдопротоколе javascript
    В файл bootstrap.css внесены изменения:
    1. К именам всех классов добавлен префикс
      для исключения возможности возникновения конфликта со стилями сайта
      (При использовании SASS для добавления префикса возникают
      ошибки в правилах - @...( например @font-face))
    2. В конце файла находятся доболнительные правила
  */
  
  HTML = (function() {
    var widget, //HTMLElement - корневой элемент букмарклета
      resultBlock, //HTMLElement - контейнер для результата перевода
      labelBlock, //HTMLElement - контейнер для label(информация обязательная к показу по условиям использования API)
      builderResultBlock, // функция преобразования рез-та в HTML, выбирается медиатором
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
    /*
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
    */
  /*Функции преобразования результата перевода в html строку (содержимое resultBlock)*/
    /*Шаблон представления результата в виде списка*/
    function result2List(resultTranslate) {
      //итоговая HTML строка которая будет встраиваться в блок представления результата
      var html,
      nav,// часть html, будет содержать bootstrap Nav tabs 
      tabContent,// часть html, будет содержать bootstrap Tab panes
      arr;
      html = nav = tabContent = '';
      //самовызывающаяся ф-ия нужна только для наглядности, в ней формируются nav и tabContent
      (function() {
        //эти переменные активируют первый элемент результата и переопределяются в пустую строку
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
    /*шаблон результата - строки*/
    function result2Sentence(result) {
      return '<div class="col-xs-12"><p class="well">' + result + '</p></div>';
    }
    /*шаблон сообщения об ошибке*/
    function showNotice(text) {
      return '<div class="col-xs-12"><p class="text-danger text-center">' + text + '</p></div>';
    }
    /*Добавление префикса ко всем id в HTML-разметке букмарклета*/
    function addPrefixes(prefix) {
      // добавление префикса к id кореневого элемента
      widget.id = addPrefixe2Id(widget.id, prefix);
      // добавление префикса к cодержимому кореневого элемента
      var widgetDescendants = widget.getElementsByTagName('*');
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
        /*case 'table': builderResultBlock = result2Table;
          break;*/
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
  
  /*Обработчик событий*/
  eventHandler = (function() {
    var widget, listeners = [];
    
    /*Здесь хранятся данные о событиях, 
    некоторые данные генерируются динамически,
    поэтому приходится хранить события в функции
    и вызывать только когда виджет создан и добавлен на страницу*/
    function createListenersDescription() {
      widget = HTML.getWidget();
      listeners = [
      /*Функции обратного вызова будут оперировать уже готовы виджетом,
      так что если при создании виджета были добавлены префиксы к id
      - это нужно учитывать и в Функциях обратного вызова,
      функция getById поможет получить нужный элемент с учетом префиксов*/
        { /* Получение выделенного текста*/
          DOMElement: document.body, 
          eventType: 'mouseup',
          callback: function(e){
            /*событие не распространяется на содержимое самого виджета
            (выделенный текст не будет автоматически переведен)*/
            if (widget.contains(e.target)) {
              return;
            }
            var selectedText = window.getSelection().toString();
            if(selectedText){ //если какой-то текст выделен пользователем
              mediator.gotTask( selectedText );
            }
          }
        },
        { /*Чтобы событие получения выделенного текста не срабатывало
          при одинарном щелчке при уже выделенном тексте*/
          DOMElement: document.body,
          eventType: 'mousedown',
          callback: function(event){
            if( window.getSelection().toString() && (event.which === 1) ){
              window.getSelection().removeAllRanges();
            }
          }
        },
        { /*Свернуть - развернуть виджет*/
          DOMElement: getById('toggleButton', prefix),
          eventType: 'click',
          callback: toggleWidget
        },
        { /*Закрыть виджет, удалить все добавленные элементы..*/
          DOMElement: getById('closeButton', prefix),
          eventType: 'click',
          callback: mediator.stop
        },
        { /*Получение текста из формы поиска*/
          DOMElement: getById('searchButton', prefix),
          eventType: 'click',
          callback: function(e){
            e.preventDefault();
            var text = getById('searchInput', prefix).value;
            mediator.gotTask(text);
          }
        },
        {
          DOMElement: getById('selectLang', prefix),
          eventType: 'click',
          callback: function(event){
            task.setLang(event.target.value);
          }
        },
        {
          DOMElement: getById('resultBlock', prefix),
          eventType: 'click',
          callback: toggleVariantsTranslate
        }
      ];
    }
    
    
    /*Функции изменяющие состояние виджета*/
    function toggleWidget() {
      var workSpace = getById('workSpace', prefix);
      if ( workSpace.classList.contains('show')) {
        hideElement(workSpace);
      } else  {
        showElement(workSpace);
      }
    }
    function toggleVariantsTranslate(event) {
      var target = event.target,
        descendants,
        length;
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
          selectFormOfWord(target)
          return;
        }
        target = target.parentNode;
      }
     
    }
    /*Установка классов bootstrap для показа перевода выбранной формы слова/части речи*/
    function selectFormOfWord(/*HTML-элемент <a>*/a) {
      var selectedNav, selectedContent;
      selectedNav = a.parentNode;
      selectedContent = document.getElementById(a.getAttribute('href').slice(1, -1));
      selectedNav.classList.add('active');
      selectedContent.classList.add('in');
      selectedContent.classList.add('active');
    }
    
    
    function hideElement(element) {
      element.classList.remove('show');
      element.classList.add('hidden');
    }
    function showElement(element) {
      element.classList.remove('hidden');
      element.classList.add('show');
    }
    
    function addListener(DOMElement, eventType, callback) {
      if (!(DOMElement instanceof Node) ) {
        var err = new Error(DOMElement + 'не DOM-элемент');
        mediator.errorDetected(err);
      }
      DOMElement.addEventListener(eventType, callback);
    }
    function removeListener(DOMElement, eventType, callback) {
      if (!(DOMElement instanceof Node) ) {
        var err = new Error(DOMElement + 'не DOM-элемент');
        mediator.errorDetected(err);
      }
      DOMElement.removeEventListener(eventType, callback);
    }
    
    function addListeners() {
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
  
  return {
    init: init,
    stop: stop,
    selectTemplate: HTML.selectTemplate,
    reloadResultBlock: HTML.reloadResultBlock,
    reloadLabelBlock: HTML.reloadLabelBlock
  }
})();

var mediator = (function() {
  var API; //одно из APILib
  
  function start() {
    /*инициализация букмарклета(добавление HTML,
      загрука стилей, назначение обработчиков событий)*/
    view.init();
  }task
  /*Получено задание пользователя*/
  function gotTask(text) {
    var result;
    task.setText(text);
    /*Логика выбора API. Если в тексте задания 1 слово,
    то выбирается API яндекс словаря, иначе API яндекс переводчика.
    Тут же выбирается шаблон представления результата.
    (так как разные API возвращают ответы разные по форме и содержанию,
    их нужно отображать по-разному)*/
    if ( task.isOneWord() ) {
      API = APILib.selectAPI('YD'); //YD - yandexDictionaryAPI - словарь, много вариантов перевода
      view.selectTemplate('list');
    } else {
      API = APILib.selectAPI('YI') //YI - yandexInterpreterAPI - переводчик, 1 вариант перевода
      view.selectTemplate('string');
    }
    /*Ищем в кэше, если не найдено то делаем запрос на сервер API*/
    if ( result = API.findInCache( task.toString() ) ) {
      this.translateCompleted(result);
    } else {
      this.request( API.getUrl(),
                    task.getParams(),//параметры запроса
                    this.gotResponse.bind(this),//функция выз-ая при успешном завершении запроса
                    this.errorRequestDetected.bind(this)//при неудаче
                   );
    }
  }
  function request(url, params, resolve, reject) {
    courier.requestGET(url, params, resolve, reject);
  }
  function gotResponse(response) {
    var result;
    result = API.reformateResponse(response);
    this.translateCompleted(result);
  }
  function translateCompleted(result) {
    if (result.length > 0) {// Если есть какой-то результат перевода
      view.reloadResultBlock( result );
      view.reloadLabelBlock( API.getLabel() );
      API.addToCache(task.toString(), result);
    } else {
      view.selectTemplate('notice');
      view.reloadResultBlock( 'Не найдено ни одного варианта перевода текста: <mark>' + 
        task.getParams().text +
        '</mark>. Возможно, следует поменять направление перевода' );
    }
  }
  /*ф-ия обработки ошибки запроса к серверу API*/
  function errorRequestDetected(err) {
    if ( API.errorsRequest[err.code] ) {
      err.message += ' ' + API.errorsRequest[err.code][0];
      err.tellTheUser = API.errorsRequest[err.code][1];
    }
    this.errorDetected(err)
  }
  /*ф-ия обработки не специфицированных ошибок*/
  function errorDetected(err) {
    if (err.tellTheUser) {
      view.selectTemplate('YI');
      view.reloadResultBlock( result );
      view.showWidget();
    } else {
      console.error(err);
    }
  }
  function stop() { //отключение букмарклета
    view.stop();
  }
  
  return {
    start : start,
    gotTask : gotTask,
    request : request,
    gotResponse : gotResponse,
    translateCompleted : translateCompleted,
    stop : stop,
    errorRequestDetected : errorRequestDetected,
    errorDetected : errorDetected
  }
  
})();

mediator.start();