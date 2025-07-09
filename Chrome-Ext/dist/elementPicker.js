(() => {
  // node_modules/css-selector-generator/esm/utilities-iselement.js
  function isElement(input) {
    return typeof input === "object" && input !== null && input.nodeType === Node.ELEMENT_NODE;
  }

  // node_modules/css-selector-generator/esm/types.js
  var OPERATOR = {
    NONE: "",
    DESCENDANT: " ",
    CHILD: " > "
  };
  var CSS_SELECTOR_TYPE = {
    id: "id",
    class: "class",
    tag: "tag",
    attribute: "attribute",
    nthchild: "nthchild",
    nthoftype: "nthoftype"
  };

  // node_modules/css-selector-generator/esm/utilities-typescript.js
  function isEnumValue(haystack, needle) {
    return Object.values(haystack).includes(needle);
  }

  // node_modules/css-selector-generator/esm/utilities-messages.js
  var libraryName = "CssSelectorGenerator";
  function showWarning(id = "unknown problem", ...args) {
    console.warn(`${libraryName}: ${id}`, ...args);
  }

  // node_modules/css-selector-generator/esm/utilities-options.js
  var DEFAULT_OPTIONS = {
    selectors: [
      CSS_SELECTOR_TYPE.id,
      CSS_SELECTOR_TYPE.class,
      CSS_SELECTOR_TYPE.tag,
      CSS_SELECTOR_TYPE.attribute
    ],
    // if set to true, always include tag name
    includeTag: false,
    whitelist: [],
    blacklist: [],
    combineWithinSelector: true,
    combineBetweenSelectors: true,
    root: null,
    maxCombinations: Number.POSITIVE_INFINITY,
    maxCandidates: Number.POSITIVE_INFINITY
  };
  function sanitizeSelectorTypes(input) {
    if (!Array.isArray(input)) {
      return [];
    }
    return input.filter((item) => isEnumValue(CSS_SELECTOR_TYPE, item));
  }
  function isRegExp(input) {
    return input instanceof RegExp;
  }
  function isCssSelectorMatch(input) {
    return ["string", "function"].includes(typeof input) || isRegExp(input);
  }
  function sanitizeCssSelectorMatchList(input) {
    if (!Array.isArray(input)) {
      return [];
    }
    return input.filter(isCssSelectorMatch);
  }
  function isNode(input) {
    return input instanceof Node;
  }
  function isParentNode(input) {
    const validParentNodeTypes = [
      Node.DOCUMENT_NODE,
      Node.DOCUMENT_FRAGMENT_NODE,
      // this includes Shadow DOM root
      Node.ELEMENT_NODE
    ];
    return isNode(input) && validParentNodeTypes.includes(input.nodeType);
  }
  function sanitizeRoot(input, element) {
    if (isParentNode(input)) {
      if (!input.contains(element)) {
        showWarning("element root mismatch", "Provided root does not contain the element. This will most likely result in producing a fallback selector using element's real root node. If you plan to use the selector using provided root (e.g. `root.querySelector`), it will not work as intended.");
      }
      return input;
    }
    const rootNode = element.getRootNode({ composed: false });
    if (isParentNode(rootNode)) {
      if (rootNode !== document) {
        showWarning("shadow root inferred", "You did not provide a root and the element is a child of Shadow DOM. This will produce a selector using ShadowRoot as a root. If you plan to use the selector using document as a root (e.g. `document.querySelector`), it will not work as intended.");
      }
      return rootNode;
    }
    return getRootNode(element);
  }
  function sanitizeMaxNumber(input) {
    return typeof input === "number" ? input : Number.POSITIVE_INFINITY;
  }
  function sanitizeOptions(element, custom_options = {}) {
    const options = Object.assign(Object.assign({}, DEFAULT_OPTIONS), custom_options);
    return {
      selectors: sanitizeSelectorTypes(options.selectors),
      whitelist: sanitizeCssSelectorMatchList(options.whitelist),
      blacklist: sanitizeCssSelectorMatchList(options.blacklist),
      root: sanitizeRoot(options.root, element),
      combineWithinSelector: !!options.combineWithinSelector,
      combineBetweenSelectors: !!options.combineBetweenSelectors,
      includeTag: !!options.includeTag,
      maxCombinations: sanitizeMaxNumber(options.maxCombinations),
      maxCandidates: sanitizeMaxNumber(options.maxCandidates)
    };
  }

  // node_modules/css-selector-generator/esm/utilities-data.js
  function getIntersection(items = []) {
    const [firstItem = [], ...otherItems] = items;
    if (otherItems.length === 0) {
      return firstItem;
    }
    return otherItems.reduce((accumulator, currentValue) => {
      return accumulator.filter((item) => currentValue.includes(item));
    }, firstItem);
  }
  function flattenArray(input) {
    return [].concat(...input);
  }
  function wildcardToRegExp(input) {
    return input.replace(/[|\\{}()[\]^$+?.]/g, "\\$&").replace(/\*/g, ".+");
  }
  function createPatternMatcher(list) {
    const matchFunctions = list.map((item) => {
      if (isRegExp(item)) {
        return (input) => item.test(input);
      }
      if (typeof item === "function") {
        return (input) => {
          const result = item(input);
          if (typeof result !== "boolean") {
            showWarning("pattern matcher function invalid", "Provided pattern matching function does not return boolean. It's result will be ignored.", item);
            return false;
          }
          return result;
        };
      }
      if (typeof item === "string") {
        const re = new RegExp("^" + wildcardToRegExp(item) + "$");
        return (input) => re.test(input);
      }
      showWarning("pattern matcher invalid", "Pattern matching only accepts strings, regular expressions and/or functions. This item is invalid and will be ignored.", item);
      return () => false;
    });
    return (input) => matchFunctions.some((matchFunction) => matchFunction(input));
  }

  // node_modules/css-selector-generator/esm/utilities-dom.js
  function testSelector(elements, selector, root2) {
    const result = Array.from(sanitizeRoot(root2, elements[0]).querySelectorAll(selector));
    return result.length === elements.length && elements.every((element) => result.includes(element));
  }
  function getElementParents(element, root2) {
    root2 = root2 !== null && root2 !== void 0 ? root2 : getRootNode(element);
    const result = [];
    let parent = element;
    while (isElement(parent) && parent !== root2) {
      result.push(parent);
      parent = parent.parentElement;
    }
    return result;
  }
  function getParents(elements, root2) {
    return getIntersection(elements.map((element) => getElementParents(element, root2)));
  }
  function getRootNode(element) {
    return element.ownerDocument.querySelector(":root");
  }

  // node_modules/css-selector-generator/esm/constants.js
  var SELECTOR_SEPARATOR = ", ";
  var INVALID_ID_RE = new RegExp([
    "^$",
    // empty or not set
    "\\s"
    // contains whitespace
  ].join("|"));
  var INVALID_CLASS_RE = new RegExp([
    "^$"
    // empty or not set
  ].join("|"));
  var SELECTOR_PATTERN = [
    CSS_SELECTOR_TYPE.nthoftype,
    CSS_SELECTOR_TYPE.tag,
    CSS_SELECTOR_TYPE.id,
    CSS_SELECTOR_TYPE.class,
    CSS_SELECTOR_TYPE.attribute,
    CSS_SELECTOR_TYPE.nthchild
  ];

  // node_modules/css-selector-generator/esm/selector-attribute.js
  var attributeBlacklistMatch = createPatternMatcher([
    "class",
    "id",
    // Angular attributes
    "ng-*"
  ]);
  function attributeNodeToSimplifiedSelector({ name }) {
    return `[${name}]`;
  }
  function attributeNodeToSelector({ name, value }) {
    return `[${name}='${value}']`;
  }
  function isValidAttributeNode({ nodeName, nodeValue }, element) {
    const tagName = element.tagName.toLowerCase();
    if (["input", "option"].includes(tagName) && nodeName === "value") {
      return false;
    }
    if (nodeName === "src" && (nodeValue === null || nodeValue === void 0 ? void 0 : nodeValue.startsWith("data:"))) {
      return false;
    }
    return !attributeBlacklistMatch(nodeName);
  }
  function sanitizeAttributeData({ nodeName, nodeValue }) {
    return {
      name: sanitizeSelectorItem(nodeName),
      value: sanitizeSelectorItem(nodeValue !== null && nodeValue !== void 0 ? nodeValue : void 0)
    };
  }
  function getElementAttributeSelectors(element) {
    const validAttributes = Array.from(element.attributes).filter((attributeNode) => isValidAttributeNode(attributeNode, element)).map(sanitizeAttributeData);
    return [
      ...validAttributes.map(attributeNodeToSimplifiedSelector),
      ...validAttributes.map(attributeNodeToSelector)
    ];
  }
  function getAttributeSelectors(elements) {
    const elementSelectors = elements.map(getElementAttributeSelectors);
    return getIntersection(elementSelectors);
  }

  // node_modules/css-selector-generator/esm/selector-class.js
  function getElementClassSelectors(element) {
    var _a;
    return ((_a = element.getAttribute("class")) !== null && _a !== void 0 ? _a : "").trim().split(/\s+/).filter((item) => !INVALID_CLASS_RE.test(item)).map((item) => `.${sanitizeSelectorItem(item)}`);
  }
  function getClassSelectors(elements) {
    const elementSelectors = elements.map(getElementClassSelectors);
    return getIntersection(elementSelectors);
  }

  // node_modules/css-selector-generator/esm/selector-id.js
  function getElementIdSelectors(element) {
    var _a;
    const id = (_a = element.getAttribute("id")) !== null && _a !== void 0 ? _a : "";
    const selector = `#${sanitizeSelectorItem(id)}`;
    const rootNode = element.getRootNode({ composed: false });
    return !INVALID_ID_RE.test(id) && testSelector([element], selector, rootNode) ? [selector] : [];
  }
  function getIdSelector(elements) {
    return elements.length === 0 || elements.length > 1 ? [] : getElementIdSelectors(elements[0]);
  }

  // node_modules/css-selector-generator/esm/selector-nth-child.js
  function getElementNthChildSelector(element) {
    const parent = element.parentNode;
    if (parent) {
      const siblings2 = Array.from(parent.childNodes).filter(isElement);
      const elementIndex = siblings2.indexOf(element);
      if (elementIndex > -1) {
        return [
          `:nth-child(${String(elementIndex + 1)})`
        ];
      }
    }
    return [];
  }
  function getNthChildSelector(elements) {
    return getIntersection(elements.map(getElementNthChildSelector));
  }

  // node_modules/css-selector-generator/esm/selector-tag.js
  function getElementTagSelectors(element) {
    return [
      sanitizeSelectorItem(element.tagName.toLowerCase())
    ];
  }
  function getTagSelector(elements) {
    const selectors = [
      ...new Set(flattenArray(elements.map(getElementTagSelectors)))
    ];
    return selectors.length === 0 || selectors.length > 1 ? [] : [selectors[0]];
  }

  // node_modules/css-selector-generator/esm/selector-nth-of-type.js
  function getElementNthOfTypeSelector(element) {
    const tag = getTagSelector([element])[0];
    const parentElement = element.parentElement;
    if (parentElement) {
      const siblings2 = Array.from(parentElement.children).filter((element2) => element2.tagName.toLowerCase() === tag);
      const elementIndex = siblings2.indexOf(element);
      if (elementIndex > -1) {
        return [
          `${tag}:nth-of-type(${String(elementIndex + 1)})`
        ];
      }
    }
    return [];
  }
  function getNthOfTypeSelector(elements) {
    return getIntersection(elements.map(getElementNthOfTypeSelector));
  }

  // node_modules/css-selector-generator/esm/utilities-powerset.js
  function* powerSetGenerator(input = [], { maxResults = Number.POSITIVE_INFINITY } = {}) {
    let resultCounter = 0;
    let offsets = generateOffsets(1);
    while (offsets.length <= input.length && resultCounter < maxResults) {
      resultCounter += 1;
      const result = offsets.map((offset2) => input[offset2]);
      yield result;
      offsets = bumpOffsets(offsets, input.length - 1);
    }
  }
  function getPowerSet(input = [], { maxResults = Number.POSITIVE_INFINITY } = {}) {
    return Array.from(powerSetGenerator(input, { maxResults }));
  }
  function bumpOffsets(offsets = [], maxValue = 0) {
    const size = offsets.length;
    if (size === 0) {
      return [];
    }
    const result = [...offsets];
    result[size - 1] += 1;
    for (let index = size - 1; index >= 0; index--) {
      if (result[index] > maxValue) {
        if (index === 0) {
          return generateOffsets(size + 1);
        } else {
          result[index - 1]++;
          result[index] = result[index - 1] + 1;
        }
      }
    }
    if (result[size - 1] > maxValue) {
      return generateOffsets(size + 1);
    }
    return result;
  }
  function generateOffsets(size = 1) {
    return Array.from(Array(size).keys());
  }

  // node_modules/css-selector-generator/esm/utilities-cartesian.js
  function getCartesianProduct(input = {}) {
    let result = [];
    Object.entries(input).forEach(([key, values]) => {
      result = values.flatMap((value) => {
        if (result.length === 0) {
          return [{ [key]: value }];
        } else {
          return result.map((memo) => Object.assign(Object.assign({}, memo), { [key]: value }));
        }
      });
    });
    return result;
  }

  // node_modules/css-selector-generator/esm/utilities-selectors.js
  var ESCAPED_COLON = ":".charCodeAt(0).toString(16).toUpperCase();
  var SPECIAL_CHARACTERS_RE = /[ !"#$%&'()\[\]{|}<>*+,./;=?@^`~\\]/;
  function sanitizeSelectorItem(input = "") {
    return CSS ? CSS.escape(input) : legacySanitizeSelectorItem(input);
  }
  function legacySanitizeSelectorItem(input = "") {
    return input.split("").map((character) => {
      if (character === ":") {
        return `\\${ESCAPED_COLON} `;
      }
      if (SPECIAL_CHARACTERS_RE.test(character)) {
        return `\\${character}`;
      }
      return escape(character).replace(/%/g, "\\");
    }).join("");
  }
  var SELECTOR_TYPE_GETTERS = {
    tag: getTagSelector,
    id: getIdSelector,
    class: getClassSelectors,
    attribute: getAttributeSelectors,
    nthchild: getNthChildSelector,
    nthoftype: getNthOfTypeSelector
  };
  var ELEMENT_SELECTOR_TYPE_GETTERS = {
    tag: getElementTagSelectors,
    id: getElementIdSelectors,
    class: getElementClassSelectors,
    attribute: getElementAttributeSelectors,
    nthchild: getElementNthChildSelector,
    nthoftype: getElementNthOfTypeSelector
  };
  function getElementSelectorsByType(element, selectorType) {
    return ELEMENT_SELECTOR_TYPE_GETTERS[selectorType](element);
  }
  function getSelectorsByType(elements, selector_type) {
    const getter = SELECTOR_TYPE_GETTERS[selector_type];
    return getter(elements);
  }
  function filterSelectors(list = [], matchBlacklist, matchWhitelist) {
    return list.filter((item) => matchWhitelist(item) || !matchBlacklist(item));
  }
  function orderSelectors(list = [], matchWhitelist) {
    return list.sort((a, b) => {
      const a_is_whitelisted = matchWhitelist(a);
      const b_is_whitelisted = matchWhitelist(b);
      if (a_is_whitelisted && !b_is_whitelisted) {
        return -1;
      }
      if (!a_is_whitelisted && b_is_whitelisted) {
        return 1;
      }
      return 0;
    });
  }
  function getAllSelectors(elements, root2, options) {
    const selectors_list = getSelectorsList(elements, options);
    const type_combinations = getTypeCombinations(selectors_list, options);
    const all_selectors = flattenArray(type_combinations);
    return [...new Set(all_selectors)];
  }
  function getSelectorsList(elements, options) {
    const { blacklist, whitelist, combineWithinSelector, maxCombinations } = options;
    const matchBlacklist = createPatternMatcher(blacklist);
    const matchWhitelist = createPatternMatcher(whitelist);
    const reducer = (data, selector_type) => {
      const selectors_by_type = getSelectorsByType(elements, selector_type);
      const filtered_selectors = filterSelectors(selectors_by_type, matchBlacklist, matchWhitelist);
      const found_selectors = orderSelectors(filtered_selectors, matchWhitelist);
      data[selector_type] = combineWithinSelector ? getPowerSet(found_selectors, { maxResults: maxCombinations }) : found_selectors.map((item) => [item]);
      return data;
    };
    return getSelectorsToGet(options).reduce(reducer, {});
  }
  function getSelectorsToGet(options) {
    const { selectors, includeTag } = options;
    const selectors_to_get = [...selectors];
    if (includeTag && !selectors_to_get.includes("tag")) {
      selectors_to_get.push("tag");
    }
    return selectors_to_get;
  }
  function addTagTypeIfNeeded(list) {
    return list.includes(CSS_SELECTOR_TYPE.tag) || list.includes(CSS_SELECTOR_TYPE.nthoftype) ? [...list] : [...list, CSS_SELECTOR_TYPE.tag];
  }
  function combineSelectorTypes(options) {
    const { selectors, combineBetweenSelectors, includeTag, maxCandidates } = options;
    const combinations = combineBetweenSelectors ? getPowerSet(selectors, { maxResults: maxCandidates }) : selectors.map((item) => [item]);
    return includeTag ? combinations.map(addTagTypeIfNeeded) : combinations;
  }
  function getTypeCombinations(selectors_list, options) {
    return combineSelectorTypes(options).map((item) => {
      return constructSelectors(item, selectors_list);
    }).filter((item) => item.length > 0);
  }
  function constructSelectors(selector_types, selectors_by_type) {
    const data = {};
    selector_types.forEach((selector_type) => {
      const selector_variants = selectors_by_type[selector_type];
      if (selector_variants && selector_variants.length > 0) {
        data[selector_type] = selector_variants;
      }
    });
    const combinations = getCartesianProduct(data);
    return combinations.map(constructSelector);
  }
  function constructSelectorType(selector_type, selectors_data) {
    return selectors_data[selector_type] ? selectors_data[selector_type].join("") : "";
  }
  function constructSelector(selectorData = {}) {
    const pattern = [...SELECTOR_PATTERN];
    if (selectorData[CSS_SELECTOR_TYPE.tag] && selectorData[CSS_SELECTOR_TYPE.nthoftype]) {
      pattern.splice(pattern.indexOf(CSS_SELECTOR_TYPE.tag), 1);
    }
    return pattern.map((type) => constructSelectorType(type, selectorData)).join("");
  }
  function generateCandidateCombinations(selectors, rootSelector) {
    return [
      ...selectors.map((selector) => rootSelector + OPERATOR.DESCENDANT + selector),
      ...selectors.map((selector) => rootSelector + OPERATOR.CHILD + selector)
    ];
  }
  function generateCandidates(selectors, rootSelector) {
    return rootSelector === "" ? selectors : generateCandidateCombinations(selectors, rootSelector);
  }
  function getSelectorWithinRoot(elements, root2, rootSelector = "", options) {
    const elementSelectors = getAllSelectors(elements, root2, options);
    const selectorCandidates = generateCandidates(elementSelectors, rootSelector);
    for (const candidateSelector of selectorCandidates) {
      if (testSelector(elements, candidateSelector, root2)) {
        return candidateSelector;
      }
    }
    return null;
  }
  function getClosestIdentifiableParent(elements, root2, rootSelector = "", options) {
    if (elements.length === 0) {
      return null;
    }
    const candidatesList = [
      elements.length > 1 ? elements : [],
      ...getParents(elements, root2).map((element) => [element])
    ];
    for (const currentElements of candidatesList) {
      const result = getSelectorWithinRoot(currentElements, root2, rootSelector, options);
      if (result) {
        return {
          foundElements: currentElements,
          selector: result
        };
      }
    }
    return null;
  }
  function sanitizeSelectorNeedle(needle) {
    if (needle instanceof NodeList || needle instanceof HTMLCollection) {
      needle = Array.from(needle);
    }
    const elements = (Array.isArray(needle) ? needle : [needle]).filter(isElement);
    return [...new Set(elements)];
  }

  // node_modules/css-selector-generator/esm/utilities-element-data.js
  function createElementSelectorData(selector) {
    return {
      value: selector,
      include: false
    };
  }
  function createElementData(element, selectorTypes, operator = OPERATOR.NONE) {
    const selectors = {};
    selectorTypes.forEach((selectorType) => {
      Reflect.set(selectors, selectorType, getElementSelectorsByType(element, selectorType).map(createElementSelectorData));
    });
    return {
      element,
      operator,
      selectors
    };
  }
  function constructElementSelector({ selectors, operator }) {
    let pattern = [...SELECTOR_PATTERN];
    if (selectors[CSS_SELECTOR_TYPE.tag] && selectors[CSS_SELECTOR_TYPE.nthoftype]) {
      pattern = pattern.filter((item) => item !== CSS_SELECTOR_TYPE.tag);
    }
    let selector = "";
    pattern.forEach((selectorType) => {
      var _a;
      const selectorsOfType = (_a = selectors[selectorType]) !== null && _a !== void 0 ? _a : [];
      selectorsOfType.forEach(({ value, include }) => {
        if (include) {
          selector += value;
        }
      });
    });
    return operator + selector;
  }

  // node_modules/css-selector-generator/esm/selector-fallback.js
  function getElementFallbackSelector(element) {
    const parentElements = getElementParents(element).reverse();
    const elementsData = parentElements.map((element2) => {
      const elementData = createElementData(element2, [CSS_SELECTOR_TYPE.nthchild], OPERATOR.CHILD);
      elementData.selectors.nthchild.forEach((selectorData) => {
        selectorData.include = true;
      });
      return elementData;
    });
    return [":root", ...elementsData.map(constructElementSelector)].join("");
  }
  function getFallbackSelector(elements) {
    return elements.map(getElementFallbackSelector).join(SELECTOR_SEPARATOR);
  }

  // node_modules/css-selector-generator/esm/index.js
  function getCssSelector(needle, custom_options = {}) {
    var _a;
    const elements = sanitizeSelectorNeedle(needle);
    const options = sanitizeOptions(elements[0], custom_options);
    const root2 = (_a = options.root) !== null && _a !== void 0 ? _a : getRootNode(elements[0]);
    let partialSelector = "";
    let currentRoot = root2;
    function updateIdentifiableParent() {
      return getClosestIdentifiableParent(elements, currentRoot, partialSelector, options);
    }
    let closestIdentifiableParent = updateIdentifiableParent();
    while (closestIdentifiableParent) {
      const { foundElements, selector } = closestIdentifiableParent;
      if (testSelector(elements, selector, root2)) {
        return selector;
      }
      currentRoot = foundElements[0];
      partialSelector = selector;
      closestIdentifiableParent = updateIdentifiableParent();
    }
    if (elements.length > 1) {
      return elements.map((element) => getCssSelector(element, options)).join(SELECTOR_SEPARATOR);
    }
    return getFallbackSelector(elements);
  }

  // node_modules/dom-helpers/esm/ownerDocument.js
  function ownerDocument(node) {
    return node && node.ownerDocument || document;
  }

  // node_modules/dom-helpers/esm/canUseDOM.js
  var canUseDOM_default = !!(typeof window !== "undefined" && window.document && window.document.createElement);

  // node_modules/dom-helpers/esm/addEventListener.js
  var optionsSupported = false;
  var onceSupported = false;
  try {
    const options = {
      get passive() {
        return optionsSupported = true;
      },
      get once() {
        return onceSupported = optionsSupported = true;
      }
    };
    if (canUseDOM_default) {
      window.addEventListener("test", options, options);
      window.removeEventListener("test", options, true);
    }
  } catch (e) {
  }

  // node_modules/dom-helpers/esm/animationFrame.js
  var prev = (/* @__PURE__ */ new Date()).getTime();
  function fallback(fn) {
    const curr = (/* @__PURE__ */ new Date()).getTime();
    const ms = Math.max(0, 16 - (curr - prev));
    const handle = setTimeout(fn, ms);
    prev = curr;
    return handle;
  }
  var vendors = ["", "webkit", "moz", "o", "ms"];
  var cancelMethod = "clearTimeout";
  var rafImpl = fallback;
  var getKey = (vendor, k) => `${vendor + (!vendor ? k : k[0].toUpperCase() + k.substr(1))}AnimationFrame`;
  if (canUseDOM_default) {
    vendors.some((vendor) => {
      const rafMethod = getKey(vendor, "request");
      if (rafMethod in window) {
        cancelMethod = getKey(vendor, "cancel");
        rafImpl = (cb) => window[rafMethod](cb);
      }
      return !!rafImpl;
    });
  }

  // node_modules/dom-helpers/esm/contains.js
  function contains(context, node) {
    if (context.contains)
      return context.contains(node);
    if (context.compareDocumentPosition)
      return context === node || !!(context.compareDocumentPosition(node) & 16);
  }

  // node_modules/dom-helpers/esm/childNodes.js
  var toArray = Function.prototype.bind.call(Function.prototype.call, [].slice);

  // node_modules/dom-helpers/esm/querySelectorAll.js
  var toArray2 = Function.prototype.bind.call(Function.prototype.call, [].slice);

  // node_modules/dom-helpers/esm/isDocument.js
  function isDocument(element) {
    return "nodeType" in element && element.nodeType === document.DOCUMENT_NODE;
  }

  // node_modules/dom-helpers/esm/isWindow.js
  function isWindow(node) {
    if ("window" in node && node.window === node)
      return node;
    if (isDocument(node))
      return node.defaultView || false;
    return false;
  }

  // node_modules/dom-helpers/esm/getScrollAccessor.js
  function getscrollAccessor(offset2) {
    const prop = offset2 === "pageXOffset" ? "scrollLeft" : "scrollTop";
    function scrollAccessor(node, val) {
      const win = isWindow(node);
      if (val === void 0) {
        return win ? win[offset2] : node[prop];
      }
      if (win) {
        win.scrollTo(win[offset2], val);
      } else {
        node[prop] = val;
      }
    }
    return scrollAccessor;
  }

  // node_modules/dom-helpers/esm/scrollLeft.js
  var scrollLeft_default = getscrollAccessor("pageXOffset");

  // node_modules/dom-helpers/esm/scrollTop.js
  var scrollTop_default = getscrollAccessor("pageYOffset");

  // node_modules/dom-helpers/esm/offset.js
  function offset(node) {
    const doc = ownerDocument(node);
    let box = {
      top: 0,
      left: 0,
      height: 0,
      width: 0
    };
    const docElem = doc && doc.documentElement;
    if (!docElem || !contains(docElem, node))
      return box;
    if (node.getBoundingClientRect !== void 0)
      box = node.getBoundingClientRect();
    box = {
      top: box.top + scrollTop_default(docElem) - (docElem.clientTop || 0),
      left: box.left + scrollLeft_default(docElem) - (docElem.clientLeft || 0),
      width: box.width,
      height: box.height
    };
    return box;
  }

  // node_modules/dom-helpers/esm/height.js
  function height(node, client) {
    const win = isWindow(node);
    return win ? win.innerHeight : client ? node.clientHeight : offset(node).height;
  }

  // node_modules/dom-helpers/esm/isVisible.js
  function isVisible(node) {
    return node ? !!(node.offsetWidth || node.offsetHeight || node.getClientRects().length) : false;
  }

  // node_modules/dom-helpers/esm/width.js
  function getWidth(node, client) {
    const win = isWindow(node);
    return win ? win.innerWidth : client ? node.clientWidth : offset(node).width;
  }

  // node_modules/lodash-es/_freeGlobal.js
  var freeGlobal = typeof global == "object" && global && global.Object === Object && global;
  var freeGlobal_default = freeGlobal;

  // node_modules/lodash-es/_root.js
  var freeSelf = typeof self == "object" && self && self.Object === Object && self;
  var root = freeGlobal_default || freeSelf || Function("return this")();
  var root_default = root;

  // node_modules/lodash-es/_Symbol.js
  var Symbol = root_default.Symbol;
  var Symbol_default = Symbol;

  // node_modules/lodash-es/_getRawTag.js
  var objectProto = Object.prototype;
  var hasOwnProperty = objectProto.hasOwnProperty;
  var nativeObjectToString = objectProto.toString;
  var symToStringTag = Symbol_default ? Symbol_default.toStringTag : void 0;
  function getRawTag(value) {
    var isOwn = hasOwnProperty.call(value, symToStringTag), tag = value[symToStringTag];
    try {
      value[symToStringTag] = void 0;
      var unmasked = true;
    } catch (e) {
    }
    var result = nativeObjectToString.call(value);
    if (unmasked) {
      if (isOwn) {
        value[symToStringTag] = tag;
      } else {
        delete value[symToStringTag];
      }
    }
    return result;
  }
  var getRawTag_default = getRawTag;

  // node_modules/lodash-es/_objectToString.js
  var objectProto2 = Object.prototype;
  var nativeObjectToString2 = objectProto2.toString;
  function objectToString(value) {
    return nativeObjectToString2.call(value);
  }
  var objectToString_default = objectToString;

  // node_modules/lodash-es/_baseGetTag.js
  var nullTag = "[object Null]";
  var undefinedTag = "[object Undefined]";
  var symToStringTag2 = Symbol_default ? Symbol_default.toStringTag : void 0;
  function baseGetTag(value) {
    if (value == null) {
      return value === void 0 ? undefinedTag : nullTag;
    }
    return symToStringTag2 && symToStringTag2 in Object(value) ? getRawTag_default(value) : objectToString_default(value);
  }
  var baseGetTag_default = baseGetTag;

  // node_modules/lodash-es/isObjectLike.js
  function isObjectLike(value) {
    return value != null && typeof value == "object";
  }
  var isObjectLike_default = isObjectLike;

  // node_modules/lodash-es/isSymbol.js
  var symbolTag = "[object Symbol]";
  function isSymbol(value) {
    return typeof value == "symbol" || isObjectLike_default(value) && baseGetTag_default(value) == symbolTag;
  }
  var isSymbol_default = isSymbol;

  // node_modules/lodash-es/_trimmedEndIndex.js
  var reWhitespace = /\s/;
  function trimmedEndIndex(string) {
    var index = string.length;
    while (index-- && reWhitespace.test(string.charAt(index))) {
    }
    return index;
  }
  var trimmedEndIndex_default = trimmedEndIndex;

  // node_modules/lodash-es/_baseTrim.js
  var reTrimStart = /^\s+/;
  function baseTrim(string) {
    return string ? string.slice(0, trimmedEndIndex_default(string) + 1).replace(reTrimStart, "") : string;
  }
  var baseTrim_default = baseTrim;

  // node_modules/lodash-es/isObject.js
  function isObject(value) {
    var type = typeof value;
    return value != null && (type == "object" || type == "function");
  }
  var isObject_default = isObject;

  // node_modules/lodash-es/toNumber.js
  var NAN = 0 / 0;
  var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;
  var reIsBinary = /^0b[01]+$/i;
  var reIsOctal = /^0o[0-7]+$/i;
  var freeParseInt = parseInt;
  function toNumber(value) {
    if (typeof value == "number") {
      return value;
    }
    if (isSymbol_default(value)) {
      return NAN;
    }
    if (isObject_default(value)) {
      var other = typeof value.valueOf == "function" ? value.valueOf() : value;
      value = isObject_default(other) ? other + "" : other;
    }
    if (typeof value != "string") {
      return value === 0 ? value : +value;
    }
    value = baseTrim_default(value);
    var isBinary = reIsBinary.test(value);
    return isBinary || reIsOctal.test(value) ? freeParseInt(value.slice(2), isBinary ? 2 : 8) : reIsBadHex.test(value) ? NAN : +value;
  }
  var toNumber_default = toNumber;

  // node_modules/lodash-es/now.js
  var now = function() {
    return root_default.Date.now();
  };
  var now_default = now;

  // node_modules/lodash-es/debounce.js
  var FUNC_ERROR_TEXT = "Expected a function";
  var nativeMax = Math.max;
  var nativeMin = Math.min;
  function debounce(func, wait, options) {
    var lastArgs, lastThis, maxWait, result, timerId, lastCallTime, lastInvokeTime = 0, leading = false, maxing = false, trailing = true;
    if (typeof func != "function") {
      throw new TypeError(FUNC_ERROR_TEXT);
    }
    wait = toNumber_default(wait) || 0;
    if (isObject_default(options)) {
      leading = !!options.leading;
      maxing = "maxWait" in options;
      maxWait = maxing ? nativeMax(toNumber_default(options.maxWait) || 0, wait) : maxWait;
      trailing = "trailing" in options ? !!options.trailing : trailing;
    }
    function invokeFunc(time) {
      var args = lastArgs, thisArg = lastThis;
      lastArgs = lastThis = void 0;
      lastInvokeTime = time;
      result = func.apply(thisArg, args);
      return result;
    }
    function leadingEdge(time) {
      lastInvokeTime = time;
      timerId = setTimeout(timerExpired, wait);
      return leading ? invokeFunc(time) : result;
    }
    function remainingWait(time) {
      var timeSinceLastCall = time - lastCallTime, timeSinceLastInvoke = time - lastInvokeTime, timeWaiting = wait - timeSinceLastCall;
      return maxing ? nativeMin(timeWaiting, maxWait - timeSinceLastInvoke) : timeWaiting;
    }
    function shouldInvoke(time) {
      var timeSinceLastCall = time - lastCallTime, timeSinceLastInvoke = time - lastInvokeTime;
      return lastCallTime === void 0 || timeSinceLastCall >= wait || timeSinceLastCall < 0 || maxing && timeSinceLastInvoke >= maxWait;
    }
    function timerExpired() {
      var time = now_default();
      if (shouldInvoke(time)) {
        return trailingEdge(time);
      }
      timerId = setTimeout(timerExpired, remainingWait(time));
    }
    function trailingEdge(time) {
      timerId = void 0;
      if (trailing && lastArgs) {
        return invokeFunc(time);
      }
      lastArgs = lastThis = void 0;
      return result;
    }
    function cancel2() {
      if (timerId !== void 0) {
        clearTimeout(timerId);
      }
      lastInvokeTime = 0;
      lastArgs = lastCallTime = lastThis = timerId = void 0;
    }
    function flush() {
      return timerId === void 0 ? result : trailingEdge(now_default());
    }
    function debounced() {
      var time = now_default(), isInvoking = shouldInvoke(time);
      lastArgs = arguments;
      lastThis = this;
      lastCallTime = time;
      if (isInvoking) {
        if (timerId === void 0) {
          return leadingEdge(lastCallTime);
        }
        if (maxing) {
          clearTimeout(timerId);
          timerId = setTimeout(timerExpired, wait);
          return invokeFunc(lastCallTime);
        }
      }
      if (timerId === void 0) {
        timerId = setTimeout(timerExpired, wait);
      }
      return result;
    }
    debounced.cancel = cancel2;
    debounced.flush = flush;
    return debounced;
  }
  var debounce_default = debounce;

  // node_modules/lodash-es/throttle.js
  var FUNC_ERROR_TEXT2 = "Expected a function";
  function throttle(func, wait, options) {
    var leading = true, trailing = true;
    if (typeof func != "function") {
      throw new TypeError(FUNC_ERROR_TEXT2);
    }
    if (isObject_default(options)) {
      leading = "leading" in options ? !!options.leading : leading;
      trailing = "trailing" in options ? !!options.trailing : trailing;
    }
    return debounce_default(func, wait, {
      "leading": leading,
      "maxWait": wait,
      "trailing": trailing
    });
  }
  var throttle_default = throttle;

  // src/elementPicker.js
  (() => {
    var ElementManager = class {
      constructor() {
        this.elementStore = /* @__PURE__ */ new Map();
        this.elementCounter = 1;
        this.storageKey = "web_llm_elements";
        this.selectorCache = /* @__PURE__ */ new Map();
        this.mutationObservers = /* @__PURE__ */ new Map();
        this.loadStoredElements();
      }
      // Load elements from Chrome storage
      async loadStoredElements() {
        try {
          const result = await chrome.storage.local.get([this.storageKey]);
          if (result[this.storageKey]) {
            const stored = result[this.storageKey];
            this.elementStore = new Map(stored.elements || []);
            this.elementCounter = stored.counter || 1;
            console.log(`Loaded ${this.elementStore.size} stored elements`);
          }
        } catch (error) {
          console.error("Error loading stored elements:", error);
        }
      }
      // Save elements to Chrome storage with debouncing
      saveElements = debounce_default(async () => {
        try {
          const dataToStore = {
            elements: Array.from(this.elementStore.entries()),
            counter: this.elementCounter,
            timestamp: Date.now()
          };
          await chrome.storage.local.set({
            [this.storageKey]: dataToStore
          });
          console.log("Elements saved to storage");
        } catch (error) {
          console.error("Error saving elements:", error);
        }
      }, 300);
      // Clear all stored elements
      async clearStoredElements() {
        try {
          this.mutationObservers.forEach((observer) => observer.disconnect());
          this.mutationObservers.clear();
          this.elementStore.clear();
          this.selectorCache.clear();
          this.elementCounter = 1;
          await chrome.storage.local.remove([this.storageKey]);
          console.log("All stored elements cleared");
          return true;
        } catch (error) {
          console.error("Error clearing elements:", error);
          return false;
        }
      }
      // Delete a single element
      async deleteElement(elementId) {
        try {
          if (!this.elementStore.has(elementId)) {
            console.warn(`Element "${elementId}" not found`);
            return false;
          }
          const observer = this.mutationObservers.get(elementId);
          if (observer) {
            observer.disconnect();
            this.mutationObservers.delete(elementId);
          }
          this.elementStore.delete(elementId);
          this.selectorCache.delete(elementId);
          await this.saveElements();
          console.log(`Element "${elementId}" deleted successfully`);
          return true;
        } catch (error) {
          console.error("Error deleting element:", error);
          return false;
        }
      }
      // Add a new element with enhanced tracking
      async addElement(data, options = {}) {
        console.log("ElementManager.addElement called, current counter:", this.elementCounter);
        const elementId = `element${this.elementCounter}`;
        this.elementCounter++;
        const elementData = {
          ...data,
          customName: null,
          defaultId: elementId,
          capturedAt: Date.now(),
          lastVerified: Date.now()
        };
        this.elementStore.set(elementId, elementData);
        if (data.selector && data.trackChanges && options.enableMutationObserver !== false) {
          this.setupElementTracking(elementId, data.selector);
        }
        await this.saveElements();
        console.log("Element added with ID:", elementId, "new counter:", this.elementCounter);
        return { id: elementId, data: elementData };
      }
      // Set up mutation observer for element
      setupElementTracking(elementId, selector) {
        try {
          const element = document.querySelector(selector);
          if (!element)
            return;
          const observer = new MutationObserver((mutations) => {
            this.handleElementMutation(elementId, mutations);
          });
          observer.observe(element, {
            attributes: true,
            characterData: true,
            childList: true,
            subtree: true
          });
          this.mutationObservers.set(elementId, observer);
        } catch (error) {
          console.error("Error setting up element tracking:", error);
        }
      }
      // Handle element mutations
      handleElementMutation(elementId, mutations) {
        const data = this.elementStore.get(elementId);
        if (!data)
          return;
        const updates = {
          lastModified: Date.now(),
          mutations: mutations.map((m) => ({
            type: m.type,
            attributeName: m.attributeName,
            oldValue: m.oldValue
          }))
        };
        this.elementStore.set(elementId, { ...data, ...updates });
        this.saveElements();
      }
      // Rename an element
      async renameElement(currentName, newName) {
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(newName)) {
          throw new Error("Invalid name. Use only letters, numbers, and underscores. Must start with a letter.");
        }
        const existingElement = this.findElementByName(newName);
        if (existingElement && existingElement !== currentName) {
          throw new Error(`Name "@${newName}" is already in use.`);
        }
        const elementData = this.elementStore.get(currentName);
        if (!elementData) {
          throw new Error(`Element "@${currentName}" not found.`);
        }
        if (newName !== elementData.defaultId) {
          this.elementStore.delete(currentName);
          elementData.customName = newName;
          this.elementStore.set(newName, elementData);
        } else {
          elementData.customName = null;
          if (currentName !== elementData.defaultId) {
            this.elementStore.delete(currentName);
            this.elementStore.set(elementData.defaultId, elementData);
          }
        }
        await this.saveElements();
        return true;
      }
      // Find element by custom name or default ID
      findElementByName(name) {
        for (const [key, data] of this.elementStore.entries()) {
          if (key === name || data.customName === name) {
            return key;
          }
        }
        return null;
      }
      // Get current name of an element
      getCurrentName(elementKey) {
        const data = this.elementStore.get(elementKey);
        return (data == null ? void 0 : data.customName) || elementKey;
      }
      // Get element data by reference
      getElementData(elementRef) {
        return this.elementStore.get(elementRef);
      }
      // Get all stored elements
      getAllElements() {
        return Array.from(this.elementStore.entries()).map(([id, data]) => ({
          id,
          displayName: data.customName || id,
          data,
          name: data.id ? `#${data.id}` : data.className ? `.${data.className.toString().split(" ")[0]}` : `<${data.tagName}>`
        }));
      }
      // Verify element still exists and update selector if needed
      async verifyElement(elementId) {
        const data = this.elementStore.get(elementId);
        if (!data)
          return false;
        let element = document.querySelector(data.selector);
        if (!element && data.fallbackSelectors) {
          for (const selector of data.fallbackSelectors) {
            element = document.querySelector(selector);
            if (element) {
              data.selector = selector;
              break;
            }
          }
        }
        if (!element && data.contentFingerprint) {
          element = this.findByContentFingerprint(data.contentFingerprint);
          if (element) {
            const picker = new ElementPicker(this);
            const newData = picker.extractElementData(element);
            data.selector = newData.selector;
            data.fallbackSelectors = newData.fallbackSelectors;
          }
        }
        data.lastVerified = Date.now();
        data.isValid = !!element;
        this.elementStore.set(elementId, data);
        await this.saveElements();
        return !!element;
      }
      // Find element by content fingerprint
      findByContentFingerprint(fingerprint) {
        var _a;
        const allElements = document.querySelectorAll(fingerprint.tagName);
        for (const element of allElements) {
          const text2 = ((_a = element.textContent) == null ? void 0 : _a.trim()) || "";
          const attrs = Array.from(element.attributes).map((a) => `${a.name}=${a.value}`).sort().join("|");
          if (text2.includes(fingerprint.textSnippet) || attrs.includes(fingerprint.attributeSignature)) {
            return element;
          }
        }
        return null;
      }
      // Process message to replace element references
      processElementReferences(message) {
        const elementPattern = /@([a-zA-Z_][a-zA-Z0-9_]*)/g;
        let processedMessage = message;
        let foundElements = [];
        message.replace(elementPattern, (match, elementRef) => {
          let elementData = this.getElementData(elementRef);
          if (!elementData) {
            const actualKey = this.findElementByName(elementRef);
            if (actualKey) {
              elementData = this.getElementData(actualKey);
            }
          }
          if (elementData) {
            foundElements.push({ id: elementRef, data: elementData });
          }
          return match;
        });
        if (foundElements.length > 0) {
          processedMessage += "\n\n--- Referenced Elements ---\n";
          foundElements.forEach(({ id, data }) => {
            processedMessage += `
@${id}:
${this.formatElementInfo(data)}
`;
          });
        }
        return processedMessage;
      }
      formatElementInfo(data) {
        const styles = Object.entries(data.styles || {}).filter(([, value]) => value && value !== "none" && value !== "auto" && value !== "").map(([key, value]) => `  ${key}: ${value}`).join("\n");
        const attributes = Object.entries(data.attributes || {}).map(([key, value]) => `  ${key}: ${value}`).join("\n");
        const examples = data.manipulationExamples ? Object.entries(data.manipulationExamples).map(([action, code]) => `${action}:
${code}`).join("\n\n") : "";
        return `Element: ${data.selector}
${data.fallbackSelectors ? `Fallback Selectors: ${data.fallbackSelectors.join(", ")}` : ""}
Tag: <${data.tagName}>
${data.id ? `ID: ${data.id}` : ""}
${data.className ? `Classes: ${data.className}` : ""}
${data.xpath ? `XPath: ${data.xpath}` : ""}
${data.position ? `Position: ${data.position.x}px, ${data.position.y}px (${data.position.width}x${data.position.height})` : ""}
${data.isValid !== void 0 ? `Valid: ${data.isValid}` : ""}
${data.isVisible !== void 0 ? `Visible: ${data.isVisible}` : ""}
${data.isClickable !== void 0 ? `Clickable: ${data.isClickable}` : ""}
${data.isInteractive !== void 0 ? `Interactive: ${data.isInteractive}` : ""}
${data.eventListeners ? `Event Listeners: ${data.eventListeners.join(", ")}` : ""}

HTML:
\`\`\`html
${data.html}
\`\`\`

${data.text ? `Text Content: "${data.text}"` : ""}

${attributes ? `Attributes:
${attributes}
` : ""}

Key Styles:
\`\`\`css
${styles}
\`\`\`

${examples ? `Console Manipulation Examples:
${examples}` : ""}`;
      }
      formatElementSummary(data, elementId) {
        const elementName = data.id ? `#${data.id}` : data.className ? `.${data.className.toString().split(" ")[0]}` : `<${data.tagName}>`;
        const text2 = data.text ? ` - "${data.text.slice(0, 50)}${data.text.length > 50 ? "..." : ""}"` : "";
        const displayName = data.customName || elementId;
        const validity = data.isValid !== void 0 ? data.isValid ? "\u2713" : "\u2717" : "";
        return `\u{1F3AF} **@${displayName}** ${validity} saved: ${elementName}${text2} (Type "rename @${displayName} newname" to rename)`;
      }
    };
    var ElementPicker = class {
      constructor(elementManager, options = {}) {
        this.isActive = false;
        this.overlay = null;
        this.highlightBox = null;
        this.infoBox = null;
        this.elementManager = elementManager;
        this.currentElement = null;
        this.shadowRoots = /* @__PURE__ */ new WeakMap();
        this.options = {
          showInfoBox: options.showInfoBox !== false,
          // Default true
          enableRightClick: options.enableRightClick !== false,
          // Default true
          enableKeyboardNav: options.enableKeyboardNav !== false,
          // Default true
          ...options
        };
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onClick = this.onClick.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onContextMenu = this.onContextMenu.bind(this);
      }
      // Core helper methods - defined first to be available throughout the class
      // Check if an ID appears to be dynamically generated
      isDynamicId(id) {
        const dynamicPatterns = [
          /\d{4,}/,
          // Long numbers (timestamps, etc.)
          /[a-f0-9]{8,}/,
          // Hex strings (UUIDs, etc.)
          /^(ember|react|vue|angular)\d+/,
          // Framework-generated IDs
          /^auto_/,
          // Auto-generated prefixes
          /temp|tmp|generated|random/i,
          // Common dynamic keywords
          /_\d+$/,
          // Ending with underscore + number
          /^[a-f0-9-]{36}$/
          // UUID pattern
        ];
        return dynamicPatterns.some((pattern) => pattern.test(id));
      }
      // Check if a class is a utility class that should be avoided
      isUtilityClass(className) {
        const utilityPatterns = [
          /^(m|p)[trblxy]?-\d+$/,
          // margin/padding utilities (m-4, pt-2, etc.)
          /^(w|h)-\d+$/,
          // width/height utilities
          /^text-(xs|sm|base|lg|xl|\d+xl)$/,
          // text size utilities
          /^(flex|grid|block|inline)/,
          // display utilities
          /^(bg|text|border)-(primary|secondary|success|danger|warning|info|light|dark)$/,
          // color utilities
          /^(rounded|shadow|opacity)/,
          // common utility prefixes
          /^(hover|focus|active):/,
          // state prefixes
          /^(sm|md|lg|xl):/,
          // responsive prefixes
          /^d-/,
          // Bootstrap display utilities
          /^col-/,
          // Bootstrap grid
          /^btn-/,
          // Bootstrap button variants (but not 'btn' itself)
          /^alert-/,
          // Bootstrap alert variants
          /^badge-/
          // Bootstrap badge variants
        ];
        return utilityPatterns.some((pattern) => pattern.test(className)) || className.length < 3 || // Very short classes are often utilities
        /^\d/.test(className);
      }
      // Get content-based selector for buttons and links
      getContentSelector(element) {
        var _a, _b;
        const tag = element.tagName.toLowerCase();
        const text2 = (_a = element.textContent) == null ? void 0 : _a.trim();
        if (tag === "input" && ["submit", "button"].includes(element.type)) {
          const value = (_b = element.value) == null ? void 0 : _b.trim();
          if (value && value.length < 30) {
            const selector = `input[value="${CSS.escape(value)}"]`;
            if (document.querySelectorAll(selector).length === 1) {
              return selector;
            }
          }
        }
        if (["button", "a"].includes(tag) && text2 && text2.length < 50) {
          const elements = Array.from(document.querySelectorAll(tag));
          const matches2 = elements.filter((el) => {
            var _a2;
            return ((_a2 = el.textContent) == null ? void 0 : _a2.trim()) === text2;
          });
          if (matches2.length === 1) {
            return `${tag} /* text: "${text2}" */`;
          }
        }
        if (tag === "input" && element.type === "submit") {
          const form = element.closest("form");
          if (form) {
            if (form.id) {
              return `#${CSS.escape(form.id)} input[type="submit"]`;
            }
            if (form.name) {
              return `form[name="${CSS.escape(form.name)}"] input[type="submit"]`;
            }
          }
        }
        return null;
      }
      // Get CSS path for an element
      getCSSPath(element) {
        const path = [];
        let current = element;
        while (current && current !== document.documentElement) {
          let selector = current.tagName.toLowerCase();
          if (current.id) {
            selector += `#${CSS.escape(current.id)}`;
            path.unshift(selector);
            break;
          }
          if (current.className) {
            const classes = (current.className || "").toString().trim().split(/\s+/);
            if (classes.length > 0) {
              selector += "." + classes.map((c) => CSS.escape(c)).join(".");
            }
          }
          const parent = current.parentElement;
          if (parent) {
            const siblings2 = Array.from(parent.children).filter((el) => el.tagName === current.tagName);
            if (siblings2.length > 1) {
              const index = siblings2.indexOf(current) + 1;
              selector += `:nth-of-type(${index})`;
            }
          }
          path.unshift(selector);
          current = parent;
        }
        return path.join(" > ");
      }
      // Check if element is focusable
      isFocusable(element) {
        const focusableTags = ["input", "textarea", "select", "button", "a"];
        return focusableTags.includes(element.tagName.toLowerCase()) || element.tabIndex >= 0 || element.isContentEditable;
      }
      start() {
        if (this.isActive)
          return;
        console.log("Starting advanced element picker...");
        this.isActive = true;
        this.scanForShadowRoots();
        this.createUI();
        this.attachEvents();
        document.body.style.cursor = "crosshair";
      }
      stop() {
        if (!this.isActive)
          return;
        console.log("Stopping element picker...");
        this.isActive = false;
        this.removeUI();
        this.detachEvents();
        document.body.style.cursor = "";
        this.currentElement = null;
      }
      // Scan for shadow roots in the document
      scanForShadowRoots() {
        const elements = document.querySelectorAll("*");
        elements.forEach((el) => {
          if (el.shadowRoot) {
            this.shadowRoots.set(el, el.shadowRoot);
          }
        });
      }
      createUI() {
        this.overlay = document.createElement("div");
        this.overlay.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: rgba(0, 0, 0, 0.01) !important;
            z-index: 999999 !important;
            cursor: crosshair !important;
            pointer-events: all !important;
        `;
        this.highlightBox = document.createElement("div");
        this.highlightBox.style.cssText = `
            position: absolute !important;
            border: 2px solid #ff6b35 !important;
            background: rgba(255, 107, 53, 0.1) !important;
            z-index: 1000000 !important;
            pointer-events: none !important;
            display: none !important;
            box-shadow: 0 0 10px rgba(255, 107, 53, 0.5) !important;
            transition: all 0.1s ease !important;
        `;
        if (this.options.showInfoBox) {
          this.infoBox = document.createElement("div");
          this.infoBox.style.cssText = `
                position: fixed !important;
                bottom: 20px !important;
                right: 20px !important;
                background: rgba(0, 0, 0, 0.9) !important;
                color: white !important;
                padding: 12px 16px !important;
                border-radius: 8px !important;
                font-size: 12px !important;
                font-family: monospace !important;
                z-index: 1000001 !important;
                pointer-events: none !important;
                display: none !important;
                max-width: 400px !important;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
            `;
        }
        document.body.appendChild(this.overlay);
        document.body.appendChild(this.highlightBox);
        if (this.infoBox)
          document.body.appendChild(this.infoBox);
      }
      removeUI() {
        if (this.overlay)
          this.overlay.remove();
        if (this.highlightBox)
          this.highlightBox.remove();
        if (this.infoBox)
          this.infoBox.remove();
        this.overlay = null;
        this.highlightBox = null;
        this.infoBox = null;
      }
      attachEvents() {
        document.addEventListener("mousemove", this.onMouseMove, true);
        document.addEventListener("click", this.onClick, true);
        if (this.options.enableRightClick) {
          document.addEventListener("contextmenu", this.onContextMenu, true);
        }
        if (this.options.enableKeyboardNav) {
          document.addEventListener("keydown", this.onKeyDown, true);
        }
      }
      detachEvents() {
        document.removeEventListener("mousemove", this.onMouseMove, true);
        document.removeEventListener("click", this.onClick, true);
        if (this.options.enableRightClick) {
          document.removeEventListener("contextmenu", this.onContextMenu, true);
        }
        if (this.options.enableKeyboardNav) {
          document.removeEventListener("keydown", this.onKeyDown, true);
        }
      }
      onMouseMove = throttle_default((e) => {
        if (!this.isActive)
          return;
        const element = this.getElementAtPoint(e.clientX, e.clientY);
        if (element && element !== this.highlightBox && element !== this.infoBox) {
          this.currentElement = element;
          this.highlightElement(element);
          if (this.options.showInfoBox) {
            this.showElementInfo(element);
          }
        }
      }, 16);
      // ~60fps
      onClick(e) {
        if (!this.isActive)
          return;
        e.preventDefault();
        e.stopPropagation();
        if (this.currentElement) {
          this.selectElement(this.currentElement);
        }
      }
      onContextMenu(e) {
        if (!this.isActive)
          return;
        e.preventDefault();
        e.stopPropagation();
        if (this.currentElement && this.currentElement.parentElement) {
          this.currentElement = this.currentElement.parentElement;
          this.highlightElement(this.currentElement);
          this.showElementInfo(this.currentElement);
        }
      }
      onKeyDown(e) {
        if (e.key === "Escape") {
          this.stop();
        } else if (this.options.enableKeyboardNav && e.key === "Enter" && this.currentElement) {
          e.preventDefault();
          this.selectElement(this.currentElement);
        }
      }
      // Get element at point including shadow DOM
      getElementAtPoint(x, y) {
        this.overlay.style.display = "none";
        let element = document.elementFromPoint(x, y);
        if (element) {
          const shadowRoot = this.shadowRoots.get(element);
          if (shadowRoot) {
            const shadowElement = shadowRoot.elementFromPoint(x, y);
            if (shadowElement)
              element = shadowElement;
          }
        }
        this.overlay.style.display = "block";
        return element;
      }
      highlightElement(element) {
        const elementOffset = offset(element);
        const elementHeight = height(element);
        const elementWidth = getWidth(element);
        this.highlightBox.style.cssText = `
            position: absolute !important;
            left: ${elementOffset.left}px !important;
            top: ${elementOffset.top}px !important;
            width: ${elementWidth}px !important;
            height: ${elementHeight}px !important;
            border: 2px solid #ff6b35 !important;
            background: rgba(255, 107, 53, 0.1) !important;
            z-index: 1000000 !important;
            pointer-events: none !important;
            display: block !important;
            box-shadow: 0 0 10px rgba(255, 107, 53, 0.5) !important;
        `;
      }
      showElementInfo(element) {
        var _a;
        const selector = this.getOptimalSelector(element);
        const tagName = element.tagName.toLowerCase();
        const text2 = ((_a = element.textContent) == null ? void 0 : _a.trim().slice(0, 30)) || "";
        this.infoBox.innerHTML = `
            <div style="color: #ff6b35; font-weight: bold; margin-bottom: 4px;">Element Info</div>
            <div>Tag: &lt;${tagName}&gt;</div>
            <div>Selector: ${selector}</div>
            ${text2 ? `<div>Text: "${text2}..."</div>` : ""}
            <div style="margin-top: 8px; color: #888;">Click to select | Right-click for parent | ESC to cancel</div>
        `;
        this.infoBox.style.display = "block";
      }
      selectElement(element) {
        console.log("Element selected:", element);
        const data = this.extractElementData(element);
        this.stop();
        chrome.runtime.sendMessage({
          action: "elementSelected",
          data
        });
      }
      extractElementData(element) {
        var _a;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const selectors = this.generateSelectors(element);
        const eventListeners = this.detectEventListeners(element);
        const contentFingerprint = this.createContentFingerprint(element);
        const accessibilityInfo = this.getAccessibilityInfo(element);
        const data = {
          // Basic info
          tagName: element.tagName.toLowerCase(),
          id: element.id || null,
          className: element.className || null,
          selector: selectors.primary,
          fallbackSelectors: selectors.fallbacks,
          xpath: this.getXPath(element),
          cssPath: this.getCSSPath(element),
          text: ((_a = element.textContent) == null ? void 0 : _a.trim().slice(0, 200)) || null,
          html: element.outerHTML.length > 1e3 ? element.outerHTML.slice(0, 1e3) + "..." : element.outerHTML,
          // Position and dimensions
          position: {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height,
            viewport: {
              top: rect.top,
              right: rect.right,
              bottom: rect.bottom,
              left: rect.left
            },
            document: {
              x: rect.left + window.scrollX,
              y: rect.top + window.scrollY
            }
          },
          // Extended styles
          styles: {
            display: style.display,
            position: style.position,
            width: style.width,
            height: style.height,
            backgroundColor: style.backgroundColor,
            color: style.color,
            fontSize: style.fontSize,
            fontFamily: style.fontFamily,
            opacity: style.opacity,
            visibility: style.visibility,
            zIndex: style.zIndex,
            cursor: style.cursor,
            overflow: style.overflow,
            border: style.border,
            padding: style.padding,
            margin: style.margin,
            transform: style.transform,
            transition: style.transition,
            boxShadow: style.boxShadow,
            borderRadius: style.borderRadius,
            pointerEvents: style.pointerEvents
          },
          // Interaction properties
          isVisible: this.isElementVisible(element),
          isClickable: this.isElementClickable(element),
          isInteractive: this.isElementInteractive(element),
          isInViewport: this.isInViewport(element),
          isFocusable: this.isFocusable(element),
          // Event listeners
          eventListeners,
          hasClickHandler: eventListeners.includes("click"),
          // All attributes
          attributes: this.getAttributes(element),
          dataAttributes: this.getDataAttributes(element),
          // Form properties
          formProperties: this.getFormProperties(element),
          // Context
          parentContext: this.getParentContext(element),
          siblingContext: this.getSiblingContext(element),
          // Accessibility
          accessibility: accessibilityInfo,
          // Content fingerprint for tracking
          contentFingerprint,
          // Shadow DOM info
          isInShadowDOM: this.isInShadowDOM(element),
          shadowRoot: element.shadowRoot ? true : false,
          // Frame info
          frameInfo: this.getFrameInfo(element),
          // Advanced manipulation examples
          manipulationExamples: this.generateAdvancedManipulationExamples(element, selectors.primary),
          // Tracking preferences (disabled by default for backward compatibility)
          trackChanges: false
        };
        return data;
      }
      // Generate multiple selector strategies using css-selector-generator
      generateSelectors(element) {
        const selectors = {
          primary: null,
          fallbacks: []
        };
        try {
          const generatedSelector = getCssSelector(element, {
            selectors: ["id", "class", "tag", "attribute", "nthchild"],
            blacklist: [/^[a-f0-9]{6,}$/i, /temp|tmp|generated|random/i, /^auto_/],
            whitelist: [],
            root: document.body,
            combineWithinSelector: true,
            includeTag: true
          });
          if (generatedSelector && document.querySelectorAll(generatedSelector).length === 1) {
            selectors.primary = generatedSelector;
          } else {
            selectors.primary = this.getCustomSelector(element);
          }
          selectors.fallbacks = this.generateFallbackSelectors(element);
        } catch (error) {
          console.warn("css-selector-generator failed:", error);
          selectors.primary = this.getCustomSelector(element);
          selectors.fallbacks = this.generateFallbackSelectors(element);
        }
        return selectors;
      }
      // Custom selector generation (fallback for css-selector-generator)
      getCustomSelector(element) {
        if (element.id && !this.isDynamicId(element.id)) {
          return `#${CSS.escape(element.id)}`;
        }
        const attrSelector = this.getSimpleAttributeSelector(element);
        if (attrSelector)
          return attrSelector;
        const classSelector = this.getUniqueClassSelector(element);
        if (classSelector)
          return classSelector;
        const contentSelector = this.getContentSelector(element);
        if (contentSelector)
          return contentSelector;
        return this.getSimplePositionSelector(element);
      }
      // Generate fallback selectors for reliability
      generateFallbackSelectors(element) {
        const fallbacks = [];
        const xpath = this.getXPath(element);
        if (xpath)
          fallbacks.push(xpath);
        const cssPath = this.getCSSPath(element);
        if (cssPath)
          fallbacks.push(cssPath);
        const contentSelector = this.getContentSelector(element);
        if (contentSelector)
          fallbacks.push(contentSelector);
        const positionSelector = this.getSimplePositionSelector(element);
        if (positionSelector)
          fallbacks.push(positionSelector);
        return [...new Set(fallbacks)];
      }
      // Get simple attribute-based selector
      getSimpleAttributeSelector(element) {
        const attrs = ["name", "type", "placeholder", "value", "title", "alt", "aria-label", "role"];
        const tag = element.tagName.toLowerCase();
        for (const attr of attrs) {
          const value = element.getAttribute(attr);
          if (value && value.length < 50 && value.length > 0) {
            const selector = `${tag}[${attr}="${CSS.escape(value)}"]`;
            if (document.querySelectorAll(selector).length === 1) {
              return selector;
            }
            if (["button", "input"].includes(tag) && ["type", "value", "aria-label"].includes(attr)) {
              const simpleSelector = `[${attr}="${CSS.escape(value)}"]`;
              if (document.querySelectorAll(simpleSelector).length === 1) {
                return simpleSelector;
              }
            }
          }
        }
        if (tag === "input" && element.type === "submit") {
          if (document.querySelectorAll('input[type="submit"]').length === 1) {
            return 'input[type="submit"]';
          }
        }
        return null;
      }
      // Get unique class selector (single class only)
      getUniqueClassSelector(element) {
        if (!element.className)
          return null;
        const classes = (element.className || "").toString().trim().split(/\s+/).filter((c) => c && !this.isUtilityClass(c));
        const tag = element.tagName.toLowerCase();
        for (const cls of classes) {
          const selector = `.${CSS.escape(cls)}`;
          if (document.querySelectorAll(selector).length === 1) {
            return selector;
          }
          const tagClassSelector = `${tag}.${CSS.escape(cls)}`;
          if (document.querySelectorAll(tagClassSelector).length === 1) {
            return tagClassSelector;
          }
        }
        return null;
      }
      // Simpler position selector (max 2 levels)
      getSimplePositionSelector(element) {
        const tag = element.tagName.toLowerCase();
        const allOfType = document.querySelectorAll(tag);
        if (allOfType.length === 1) {
          return tag;
        }
        if (allOfType.length <= 3) {
          const index = Array.from(allOfType).indexOf(element) + 1;
          return `${tag}:nth-of-type(${index})`;
        }
        let parent = element.parentElement;
        if (parent && parent.id && !this.isDynamicId(parent.id)) {
          const selector = `#${CSS.escape(parent.id)} > ${tag}`;
          if (document.querySelectorAll(selector).length === 1) {
            return selector;
          }
          const siblings2 = Array.from(parent.children).filter((el) => el.tagName === element.tagName);
          if (siblings2.length <= 3) {
            const index = siblings2.indexOf(element) + 1;
            return `#${CSS.escape(parent.id)} > ${tag}:nth-of-type(${index})`;
          }
        }
        if (parent && parent.className) {
          const parentClasses = (parent.className || "").toString().trim().split(/\s+/).filter((c) => c && !this.isUtilityClass(c));
          for (const cls of parentClasses) {
            const selector = `.${CSS.escape(cls)} > ${tag}`;
            if (document.querySelectorAll(selector).length === 1) {
              return selector;
            }
            const siblings2 = Array.from(parent.children).filter((el) => el.tagName === element.tagName);
            if (siblings2.length <= 3) {
              const index = siblings2.indexOf(element) + 1;
              const selectorWithIndex = `.${CSS.escape(cls)} > ${tag}:nth-of-type(${index})`;
              if (document.querySelectorAll(selectorWithIndex).length === 1) {
                return selectorWithIndex;
              }
            }
          }
        }
        if (parent) {
          const siblings2 = Array.from(parent.children).filter((el) => el.tagName === element.tagName);
          if (siblings2.length <= 5) {
            const index = siblings2.indexOf(element) + 1;
            return `${tag}:nth-of-type(${index})`;
          }
        }
        return tag;
      }
      // Additional core methods
      // Get XPath for an element
      getXPath(element) {
        const path = [];
        let current = element;
        while (current && current.nodeType === Node.ELEMENT_NODE) {
          let index = 1;
          let sibling = current.previousSibling;
          while (sibling) {
            if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === current.tagName) {
              index++;
            }
            sibling = sibling.previousSibling;
          }
          const tagName = current.tagName.toLowerCase();
          const step = `${tagName}[${index}]`;
          path.unshift(step);
          current = current.parentElement;
        }
        return `//${path.join("/")}`;
      }
      // Get optimal selector using css-selector-generator
      getOptimalSelector(element) {
        return this.generateSelectors(element).primary;
      }
      // Element visibility check using dom-helpers
      isElementVisible(element) {
        return isVisible(element);
      }
      isElementClickable(element) {
        const clickableTags = ["a", "button", "input", "select", "textarea", "label"];
        const clickableRoles = ["button", "link", "checkbox", "radio", "menuitem", "tab"];
        const tagName = element.tagName.toLowerCase();
        return !!(clickableTags.includes(tagName) || element.onclick || element.getAttribute("onclick") || clickableRoles.includes(element.getAttribute("role")) || getComputedStyle(element).cursor === "pointer" || element.hasAttribute("data-clickable") || element.classList.contains("clickable") || element.classList.contains("btn"));
      }
      isElementInteractive(element) {
        return !!(element.isContentEditable || element.getAttribute("contenteditable") === "true" || ["input", "textarea", "select"].includes(element.tagName.toLowerCase()) || element.tabIndex >= 0 || element.hasAttribute("draggable") || element.hasAttribute("droppable"));
      }
      isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return rect.top >= 0 && rect.left >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && rect.right <= (window.innerWidth || document.documentElement.clientWidth);
      }
      // Element attribute helpers (simplified)
      getAttributes(element) {
        return Array.from(element.attributes).reduce((acc, attr) => {
          acc[attr.name] = attr.value;
          return acc;
        }, {});
      }
      getDataAttributes(element) {
        return Array.from(element.attributes).filter((attr) => attr.name.startsWith("data-")).reduce((acc, attr) => {
          acc[attr.name] = attr.value;
          return acc;
        }, {});
      }
      getFormProperties(element) {
        const tagName = element.tagName.toLowerCase();
        if (["input", "textarea", "select"].includes(tagName)) {
          return {
            type: element.type || null,
            name: element.name || null,
            value: element.value || null,
            placeholder: element.placeholder || null,
            required: element.required || false,
            disabled: element.disabled || false,
            readonly: element.readOnly || false,
            checked: element.checked || false,
            maxLength: element.maxLength || null,
            min: element.min || null,
            max: element.max || null,
            pattern: element.pattern || null,
            autocomplete: element.autocomplete || null,
            form: element.form ? element.form.id || element.form.name : null
          };
        }
        return null;
      }
      getParentContext(element) {
        const parent = element.parentElement;
        if (!parent || parent === document.body)
          return null;
        return {
          tagName: parent.tagName.toLowerCase(),
          id: parent.id || null,
          className: parent.className || null,
          selector: this.getOptimalSelector(parent)
        };
      }
      // Simplified event listener detection
      detectEventListeners(element) {
        const listeners = /* @__PURE__ */ new Set();
        const eventAttrs = ["onclick", "onmouseover", "onmouseout", "onchange", "onsubmit", "onfocus", "onblur"];
        eventAttrs.forEach((attr) => {
          if (element.hasAttribute(attr)) {
            listeners.add(attr.substring(2));
          }
        });
        const tagName = element.tagName.toLowerCase();
        const style = getComputedStyle(element);
        if (style.cursor === "pointer")
          listeners.add("click");
        if (["a", "button"].includes(tagName))
          listeners.add("click");
        if (element.type === "submit")
          listeners.add("submit");
        if (["input", "textarea", "select"].includes(tagName)) {
          listeners.add("change");
          listeners.add("input");
        }
        return Array.from(listeners);
      }
      createContentFingerprint(element) {
        var _a;
        const text2 = ((_a = element.textContent) == null ? void 0 : _a.trim()) || "";
        const attributes = Array.from(element.attributes).map((a) => `${a.name}=${a.value}`).sort().join("|");
        return {
          tagName: element.tagName.toLowerCase(),
          textSnippet: text2.slice(0, 50),
          attributeSignature: attributes.slice(0, 100),
          classCount: element.classList.length,
          childCount: element.children.length
        };
      }
      getAccessibilityInfo(element) {
        return {
          role: element.getAttribute("role"),
          ariaLabel: element.getAttribute("aria-label"),
          ariaDescribedBy: element.getAttribute("aria-describedby"),
          ariaExpanded: element.getAttribute("aria-expanded"),
          ariaHidden: element.getAttribute("aria-hidden"),
          tabIndex: element.tabIndex,
          alt: element.getAttribute("alt"),
          title: element.getAttribute("title")
        };
      }
      isInShadowDOM(element) {
        let current = element;
        while (current) {
          if (current.getRootNode() !== document) {
            return true;
          }
          current = current.parentElement;
        }
        return false;
      }
      getFrameInfo(element) {
        return {
          isInFrame: window !== window.top,
          frameDepth: this.getFrameDepth(),
          frameOrigin: window.location.origin
        };
      }
      getFrameDepth() {
        let depth = 0;
        let current = window;
        try {
          while (current !== current.parent) {
            depth++;
            current = current.parent;
          }
        } catch (e) {
        }
        return depth;
      }
      getSiblingContext(element) {
        var _a, _b;
        const parent = element.parentElement;
        if (!parent)
          return null;
        const siblings2 = Array.from(parent.children);
        const index = siblings2.indexOf(element);
        return {
          totalSiblings: siblings2.length,
          index,
          isFirst: index === 0,
          isLast: index === siblings2.length - 1,
          previousSibling: ((_a = siblings2[index - 1]) == null ? void 0 : _a.tagName.toLowerCase()) || null,
          nextSibling: ((_b = siblings2[index + 1]) == null ? void 0 : _b.tagName.toLowerCase()) || null
        };
      }
      generateAdvancedManipulationExamples(element, selector) {
        const examples = {};
        const tagName = element.tagName.toLowerCase();
        examples["Click"] = `document.querySelector('${selector}').click()`;
        examples["Focus"] = `document.querySelector('${selector}').focus()`;
        if (["input", "textarea"].includes(tagName)) {
          examples["Set Value"] = `document.querySelector('${selector}').value = 'new value'`;
          examples["Clear"] = `document.querySelector('${selector}').value = ''`;
        }
        if (element.type === "checkbox" || element.type === "radio") {
          examples["Check"] = `document.querySelector('${selector}').checked = true`;
          examples["Uncheck"] = `document.querySelector('${selector}').checked = false`;
        }
        if (tagName === "select") {
          examples["Select Option"] = `document.querySelector('${selector}').value = 'option-value'`;
        }
        examples["Hide"] = `document.querySelector('${selector}').style.display = 'none'`;
        examples["Show"] = `document.querySelector('${selector}').style.display = 'block'`;
        examples["Change Text"] = `document.querySelector('${selector}').textContent = 'New text'`;
        examples["Trigger Change"] = `document.querySelector('${selector}').dispatchEvent(new Event('change'))`;
        return examples;
      }
    };
    window.ElementPicker = ElementPicker;
    window.ElementManager = ElementManager;
  })();
})();
/*! Bundled license information:

lodash-es/lodash.js:
  (**
   * @license
   * Lodash (Custom Build) <https://lodash.com/>
   * Build: `lodash modularize exports="es" -o ./`
   * Copyright OpenJS Foundation and other contributors <https://openjsf.org/>
   * Released under MIT license <https://lodash.com/license>
   * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
   * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
   *)
*/
