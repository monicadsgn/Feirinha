// Gerado por `npm run build:api` a partir de server/casa.ts. Não edite à mão.
//#region \0rolldown/runtime.js
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
//#endregion
//#region api/_receita.js
const decode = (s) => String(s || "").replace(/&quot;/g, "\"").replace(/&#39;|&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/\\n/g, "\n").trim();
const meta = (html, prop) => {
	const r = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`, "i").exec(html) || new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`, "i").exec(html);
	return r ? decode(r[1]) : "";
};
/** Instagram: "123 likes, 4 comments - fulano on March 1, 2025: "legenda..."" → só a legenda. */
function cleanInstagram(desc) {
	const m = /:\s*["“]([\s\S]+)["”]\s*\.?\s*$/.exec(desc);
	return m ? m[1] : desc;
}
function blocked(host) {
	return /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|\[|0\.)/.test(host) || /^\d+\.\d+\.\d+\.\d+$/.test(host);
}
/** Busca título e legenda. Lança Error com mensagem amigável se não conseguir. */
async function fetchRecipeMeta(raw) {
	let url;
	try {
		url = new URL(String(raw || ""));
	} catch {
		throw new Error("Link inválido.");
	}
	if (url.protocol !== "https:" || blocked(url.hostname)) throw new Error("Link inválido.");
	const host = url.hostname.replace(/^www\./, "");
	if (/tiktok\.com$/.test(host) || /(youtube\.com|youtu\.be)$/.test(host)) {
		const o = /tiktok/.test(host) ? `https://www.tiktok.com/oembed?url=${encodeURIComponent(url.href)}` : `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url.href)}`;
		const r = await fetch(o, { signal: AbortSignal.timeout(1e4) });
		if (r.ok) {
			const j = await r.json();
			return {
				title: decode(j.title).split("\n")[0].slice(0, 80),
				text: decode(j.title),
				image: j.thumbnail_url || null,
				source: host,
				url: url.href
			};
		}
	}
	const html = (await (await fetch(url, {
		headers: {
			"User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
			Accept: "text/html",
			"Accept-Language": "pt-BR,pt;q=0.9"
		},
		redirect: "follow",
		signal: AbortSignal.timeout(12e3)
	})).text()).slice(0, 6e5);
	let text = meta(html, "og:description") || meta(html, "description");
	let title = meta(html, "og:title") || decode((/<title[^>]*>([^<]*)<\/title>/i.exec(html) || [])[1]);
	if (/instagram\.com$/.test(host)) {
		text = cleanInstagram(text);
		title = text.split("\n")[0].slice(0, 80) || title;
	}
	for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) try {
		const data = JSON.parse(m[1]);
		const recipe = [].concat(data["@graph"] || data).find((x) => x && (x["@type"] === "Recipe" || Array.isArray(x["@type"]) && x["@type"].includes("Recipe")));
		if (recipe) {
			title = decode(recipe.name) || title;
			const ing = [].concat(recipe.recipeIngredient || []).map(decode);
			const steps = [].concat(recipe.recipeInstructions || []).map((s) => decode(typeof s === "string" ? s : s.text || ""));
			text = [
				...ing,
				"",
				...steps
			].join("\n").trim() || text;
			break;
		}
	} catch {}
	if (!title && !text) throw new Error("Não consegui ler esse post. Cole a legenda manualmente.");
	return {
		title,
		text,
		image: meta(html, "og:image") || null,
		source: host,
		url: url.href
	};
}
//#endregion
//#region node_modules/react/cjs/react.production.js
/**
* @license React
* react.production.js
*
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/
var require_react_production = /* @__PURE__ */ __commonJSMin(((exports) => {
	var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element");
	var REACT_PORTAL_TYPE = Symbol.for("react.portal");
	var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
	var REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode");
	var REACT_PROFILER_TYPE = Symbol.for("react.profiler");
	var REACT_CONSUMER_TYPE = Symbol.for("react.consumer");
	var REACT_CONTEXT_TYPE = Symbol.for("react.context");
	var REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
	var REACT_SUSPENSE_TYPE = Symbol.for("react.suspense");
	var REACT_MEMO_TYPE = Symbol.for("react.memo");
	var REACT_LAZY_TYPE = Symbol.for("react.lazy");
	var REACT_ACTIVITY_TYPE = Symbol.for("react.activity");
	var REACT_VIEW_TRANSITION_TYPE = Symbol.for("react.view_transition");
	var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
	function getIteratorFn(maybeIterable) {
		if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
		maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
		return "function" === typeof maybeIterable ? maybeIterable : null;
	}
	var ReactNoopUpdateQueue = {
		isMounted: function() {
			return !1;
		},
		enqueueForceUpdate: function() {},
		enqueueReplaceState: function() {},
		enqueueSetState: function() {}
	};
	var assign = Object.assign;
	var emptyObject = {};
	function Component(props, context, updater) {
		this.props = props;
		this.context = context;
		this.refs = emptyObject;
		this.updater = updater || ReactNoopUpdateQueue;
	}
	Component.prototype.isReactComponent = {};
	Component.prototype.setState = function(partialState, callback) {
		if ("object" !== typeof partialState && "function" !== typeof partialState && null != partialState) throw Error("takes an object of state variables to update or a function which returns an object of state variables.");
		this.updater.enqueueSetState(this, partialState, callback, "setState");
	};
	Component.prototype.forceUpdate = function(callback) {
		this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
	};
	function ComponentDummy() {}
	ComponentDummy.prototype = Component.prototype;
	function PureComponent(props, context, updater) {
		this.props = props;
		this.context = context;
		this.refs = emptyObject;
		this.updater = updater || ReactNoopUpdateQueue;
	}
	var pureComponentPrototype = PureComponent.prototype = new ComponentDummy();
	pureComponentPrototype.constructor = PureComponent;
	assign(pureComponentPrototype, Component.prototype);
	pureComponentPrototype.isPureReactComponent = !0;
	var isArrayImpl = Array.isArray;
	function noop() {}
	var ReactSharedInternals = {
		H: null,
		A: null,
		T: null,
		S: null
	};
	var hasOwnProperty = Object.prototype.hasOwnProperty;
	function ReactElement(type, key, props) {
		var refProp = props.ref;
		return {
			$$typeof: REACT_ELEMENT_TYPE,
			type,
			key,
			ref: void 0 !== refProp ? refProp : null,
			props
		};
	}
	function cloneAndReplaceKey(oldElement, newKey) {
		return ReactElement(oldElement.type, newKey, oldElement.props);
	}
	function isValidElement(object) {
		return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
	}
	function escape(key) {
		var escaperLookup = {
			"=": "=0",
			":": "=2"
		};
		return "$" + key.replace(/[=:]/g, function(match) {
			return escaperLookup[match];
		});
	}
	var userProvidedKeyEscapeRegex = /\/+/g;
	function getElementKey(element, index) {
		return "object" === typeof element && null !== element && null != element.key ? escape("" + element.key) : index.toString(36);
	}
	function resolveThenable(thenable) {
		switch (thenable.status) {
			case "fulfilled": return thenable.value;
			case "rejected": throw thenable.reason;
			default: switch ("string" === typeof thenable.status ? thenable.then(noop, noop) : (thenable.status = "pending", thenable.then(function(fulfilledValue) {
				"pending" === thenable.status && (thenable.status = "fulfilled", thenable.value = fulfilledValue);
			}, function(error) {
				"pending" === thenable.status && (thenable.status = "rejected", thenable.reason = error);
			})), thenable.status) {
				case "fulfilled": return thenable.value;
				case "rejected": throw thenable.reason;
			}
		}
		throw thenable;
	}
	function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
		var type = typeof children;
		if ("undefined" === type || "boolean" === type) children = null;
		var invokeCallback = !1;
		if (null === children) invokeCallback = !0;
		else switch (type) {
			case "bigint":
			case "string":
			case "number":
				invokeCallback = !0;
				break;
			case "object": switch (children.$$typeof) {
				case REACT_ELEMENT_TYPE:
				case REACT_PORTAL_TYPE:
					invokeCallback = !0;
					break;
				case REACT_LAZY_TYPE: return invokeCallback = children._init, mapIntoArray(invokeCallback(children._payload), array, escapedPrefix, nameSoFar, callback);
			}
		}
		if (invokeCallback) return callback = callback(children), invokeCallback = "" === nameSoFar ? "." + getElementKey(children, 0) : nameSoFar, isArrayImpl(callback) ? (escapedPrefix = "", null != invokeCallback && (escapedPrefix = invokeCallback.replace(userProvidedKeyEscapeRegex, "$&/") + "/"), mapIntoArray(callback, array, escapedPrefix, "", function(c) {
			return c;
		})) : null != callback && (isValidElement(callback) && (callback = cloneAndReplaceKey(callback, escapedPrefix + (null == callback.key || children && children.key === callback.key ? "" : ("" + callback.key).replace(userProvidedKeyEscapeRegex, "$&/") + "/") + invokeCallback)), array.push(callback)), 1;
		invokeCallback = 0;
		var nextNamePrefix = "" === nameSoFar ? "." : nameSoFar + ":";
		if (isArrayImpl(children)) for (var i = 0; i < children.length; i++) nameSoFar = children[i], type = nextNamePrefix + getElementKey(nameSoFar, i), invokeCallback += mapIntoArray(nameSoFar, array, escapedPrefix, type, callback);
		else if (i = getIteratorFn(children), "function" === typeof i) for (children = i.call(children), i = 0; !(nameSoFar = children.next()).done;) nameSoFar = nameSoFar.value, type = nextNamePrefix + getElementKey(nameSoFar, i++), invokeCallback += mapIntoArray(nameSoFar, array, escapedPrefix, type, callback);
		else if ("object" === type) {
			if ("function" === typeof children.then) return mapIntoArray(resolveThenable(children), array, escapedPrefix, nameSoFar, callback);
			array = String(children);
			throw Error("Objects are not valid as a React child (found: " + ("[object Object]" === array ? "object with keys {" + Object.keys(children).join(", ") + "}" : array) + "). If you meant to render a collection of children, use an array instead.");
		}
		return invokeCallback;
	}
	function mapChildren(children, func, context) {
		if (null == children) return children;
		var result = [], count = 0;
		mapIntoArray(children, result, "", "", function(child) {
			return func.call(context, child, count++);
		});
		return result;
	}
	function lazyInitializer(payload) {
		if (-1 === payload._status) {
			var ctor = payload._result, thenable = ctor();
			thenable.then(function(moduleObject) {
				if (0 === payload._status || -1 === payload._status) payload._status = 1, payload._result = moduleObject, void 0 === thenable.status && (thenable.status = "fulfilled", thenable.value = moduleObject);
			}, function(error) {
				if (0 === payload._status || -1 === payload._status) payload._status = 2, payload._result = error, void 0 === thenable.status && (thenable.status = "rejected", thenable.reason = error);
			});
			-1 === payload._status && (payload._status = 0, payload._result = thenable);
		}
		if (1 === payload._status) return payload._result.default;
		throw payload._result;
	}
	var reportGlobalError = "function" === typeof reportError ? reportError : function(error) {
		if ("object" === typeof window && "function" === typeof window.ErrorEvent) {
			var event = new window.ErrorEvent("error", {
				bubbles: !0,
				cancelable: !0,
				message: "object" === typeof error && null !== error && "string" === typeof error.message ? String(error.message) : String(error),
				error
			});
			if (!window.dispatchEvent(event)) return;
		} else if ("object" === typeof process && "function" === typeof process.emit) {
			process.emit("uncaughtException", error);
			return;
		}
		console.error(error);
	};
	function startTransition(scope) {
		var prevTransition = ReactSharedInternals.T, currentTransition = {};
		currentTransition.types = null !== prevTransition ? prevTransition.types : null;
		ReactSharedInternals.T = currentTransition;
		try {
			var returnValue = scope(), onStartTransitionFinish = ReactSharedInternals.S;
			null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
			"object" === typeof returnValue && null !== returnValue && "function" === typeof returnValue.then && returnValue.then(noop, reportGlobalError);
		} catch (error) {
			reportGlobalError(error);
		} finally {
			null !== prevTransition && null !== currentTransition.types && (prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
		}
	}
	function addTransitionType(type) {
		var transition = ReactSharedInternals.T;
		if (null !== transition) {
			var transitionTypes = transition.types;
			null === transitionTypes ? transition.types = [type] : -1 === transitionTypes.indexOf(type) && transitionTypes.push(type);
		} else startTransition(addTransitionType.bind(null, type));
	}
	var Children = {
		map: mapChildren,
		forEach: function(children, forEachFunc, forEachContext) {
			mapChildren(children, function() {
				forEachFunc.apply(this, arguments);
			}, forEachContext);
		},
		count: function(children) {
			var n = 0;
			mapChildren(children, function() {
				n++;
			});
			return n;
		},
		toArray: function(children) {
			return mapChildren(children, function(child) {
				return child;
			}) || [];
		},
		only: function(children) {
			if (!isValidElement(children)) throw Error("React.Children.only expected to receive a single React element child.");
			return children;
		}
	};
	exports.Activity = REACT_ACTIVITY_TYPE;
	exports.Children = Children;
	exports.Component = Component;
	exports.Fragment = REACT_FRAGMENT_TYPE;
	exports.Profiler = REACT_PROFILER_TYPE;
	exports.PureComponent = PureComponent;
	exports.StrictMode = REACT_STRICT_MODE_TYPE;
	exports.Suspense = REACT_SUSPENSE_TYPE;
	exports.ViewTransition = REACT_VIEW_TRANSITION_TYPE;
	exports.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = ReactSharedInternals;
	exports.__COMPILER_RUNTIME = {
		__proto__: null,
		c: function(size) {
			return ReactSharedInternals.H.useMemoCache(size);
		}
	};
	exports.addTransitionType = addTransitionType;
	exports.cache = function(fn) {
		return function() {
			return fn.apply(null, arguments);
		};
	};
	exports.cacheSignal = function() {
		return null;
	};
	exports.cloneElement = function(element, config, children) {
		if (null === element || void 0 === element) throw Error("The argument must be a React element, but you passed " + element + ".");
		var props = assign({}, element.props), key = element.key;
		if (null != config) for (propName in void 0 !== config.key && (key = "" + config.key), config) !hasOwnProperty.call(config, propName) || "key" === propName || "__self" === propName || "__source" === propName || "ref" === propName && void 0 === config.ref || (props[propName] = config[propName]);
		var propName = arguments.length - 2;
		if (1 === propName) props.children = children;
		else if (1 < propName) {
			for (var childArray = Array(propName), i = 0; i < propName; i++) childArray[i] = arguments[i + 2];
			props.children = childArray;
		}
		return ReactElement(element.type, key, props);
	};
	exports.createContext = function(defaultValue) {
		defaultValue = {
			$$typeof: REACT_CONTEXT_TYPE,
			_currentValue: defaultValue,
			_currentValue2: defaultValue,
			_threadCount: 0,
			Provider: null,
			Consumer: null
		};
		defaultValue.Provider = defaultValue;
		defaultValue.Consumer = {
			$$typeof: REACT_CONSUMER_TYPE,
			_context: defaultValue
		};
		return defaultValue;
	};
	exports.createElement = function(type, config, children) {
		var propName, props = {}, key = null;
		if (null != config) for (propName in void 0 !== config.key && (key = "" + config.key), config) hasOwnProperty.call(config, propName) && "key" !== propName && "__self" !== propName && "__source" !== propName && (props[propName] = config[propName]);
		var childrenLength = arguments.length - 2;
		if (1 === childrenLength) props.children = children;
		else if (1 < childrenLength) {
			for (var childArray = Array(childrenLength), i = 0; i < childrenLength; i++) childArray[i] = arguments[i + 2];
			props.children = childArray;
		}
		if (type && type.defaultProps) for (propName in childrenLength = type.defaultProps, childrenLength) void 0 === props[propName] && (props[propName] = childrenLength[propName]);
		return ReactElement(type, key, props);
	};
	exports.createRef = function() {
		return { current: null };
	};
	exports.forwardRef = function(render) {
		return {
			$$typeof: REACT_FORWARD_REF_TYPE,
			render
		};
	};
	exports.isValidElement = isValidElement;
	exports.lazy = function(ctor) {
		return {
			$$typeof: REACT_LAZY_TYPE,
			_payload: {
				_status: -1,
				_result: ctor
			},
			_init: lazyInitializer
		};
	};
	exports.memo = function(type, compare) {
		return {
			$$typeof: REACT_MEMO_TYPE,
			type,
			compare: void 0 === compare ? null : compare
		};
	};
	exports.startTransition = startTransition;
	exports.unstable_useCacheRefresh = function() {
		return ReactSharedInternals.H.useCacheRefresh();
	};
	exports.use = function(usable) {
		return ReactSharedInternals.H.use(usable);
	};
	exports.useActionState = function(action, initialState, permalink) {
		return ReactSharedInternals.H.useActionState(action, initialState, permalink);
	};
	exports.useCallback = function(callback, deps) {
		return ReactSharedInternals.H.useCallback(callback, deps);
	};
	exports.useContext = function(Context) {
		return ReactSharedInternals.H.useContext(Context);
	};
	exports.useDebugValue = function() {};
	exports.useDeferredValue = function(value, initialValue) {
		return ReactSharedInternals.H.useDeferredValue(value, initialValue);
	};
	exports.useEffect = function(create, deps) {
		return ReactSharedInternals.H.useEffect(create, deps);
	};
	exports.useEffectEvent = function(callback) {
		return ReactSharedInternals.H.useEffectEvent(callback);
	};
	exports.useId = function() {
		return ReactSharedInternals.H.useId();
	};
	exports.useImperativeHandle = function(ref, create, deps) {
		return ReactSharedInternals.H.useImperativeHandle(ref, create, deps);
	};
	exports.useInsertionEffect = function(create, deps) {
		return ReactSharedInternals.H.useInsertionEffect(create, deps);
	};
	exports.useLayoutEffect = function(create, deps) {
		return ReactSharedInternals.H.useLayoutEffect(create, deps);
	};
	exports.useMemo = function(create, deps) {
		return ReactSharedInternals.H.useMemo(create, deps);
	};
	exports.useOptimistic = function(passthrough, reducer) {
		return ReactSharedInternals.H.useOptimistic(passthrough, reducer);
	};
	exports.useReducer = function(reducer, initialArg, init) {
		return ReactSharedInternals.H.useReducer(reducer, initialArg, init);
	};
	exports.useRef = function(initialValue) {
		return ReactSharedInternals.H.useRef(initialValue);
	};
	exports.useState = function(initialState) {
		return ReactSharedInternals.H.useState(initialState);
	};
	exports.useSyncExternalStore = function(subscribe, getSnapshot, getServerSnapshot) {
		return ReactSharedInternals.H.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
	};
	exports.useTransition = function() {
		return ReactSharedInternals.H.useTransition();
	};
	exports.version = "19.3.0";
}));
//#endregion
//#region node_modules/react/cjs/react.development.js
/**
* @license React
* react.development.js
*
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/
var require_react_development = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	"production" !== process.env.NODE_ENV && (function() {
		function defineDeprecationWarning(methodName, info) {
			Object.defineProperty(Component.prototype, methodName, { get: function() {
				console.warn("%s(...) is deprecated in plain JavaScript React classes. %s", info[0], info[1]);
			} });
		}
		function getIteratorFn(maybeIterable) {
			if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
			maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
			return "function" === typeof maybeIterable ? maybeIterable : null;
		}
		function warnNoop(publicInstance, callerName) {
			publicInstance = (publicInstance = publicInstance.constructor) && (publicInstance.displayName || publicInstance.name) || "ReactClass";
			var warningKey = publicInstance + "." + callerName;
			didWarnStateUpdateForUnmountedComponent[warningKey] || (console.error("Can't call %s on a component that is not yet mounted. This is a no-op, but it might indicate a bug in your application. Instead, assign to `this.state` directly or define a `state = {};` class property with the desired state in the %s component.", callerName, publicInstance), didWarnStateUpdateForUnmountedComponent[warningKey] = !0);
		}
		function Component(props, context, updater) {
			this.props = props;
			this.context = context;
			this.refs = emptyObject;
			this.updater = updater || ReactNoopUpdateQueue;
		}
		function ComponentDummy() {}
		function PureComponent(props, context, updater) {
			this.props = props;
			this.context = context;
			this.refs = emptyObject;
			this.updater = updater || ReactNoopUpdateQueue;
		}
		function noop() {}
		function testStringCoercion(value) {
			return "" + value;
		}
		function checkKeyStringCoercion(value) {
			try {
				testStringCoercion(value);
				var JSCompiler_inline_result = !1;
			} catch (e) {
				JSCompiler_inline_result = !0;
			}
			if (JSCompiler_inline_result) {
				JSCompiler_inline_result = console;
				var JSCompiler_temp_const = JSCompiler_inline_result.error;
				var JSCompiler_inline_result$jscomp$0 = "function" === typeof Symbol && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
				JSCompiler_temp_const.call(JSCompiler_inline_result, "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.", JSCompiler_inline_result$jscomp$0);
				return testStringCoercion(value);
			}
		}
		function getComponentNameFromType(type) {
			if (null == type) return null;
			if ("function" === typeof type) return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
			if ("string" === typeof type) return type;
			switch (type) {
				case REACT_FRAGMENT_TYPE: return "Fragment";
				case REACT_PROFILER_TYPE: return "Profiler";
				case REACT_STRICT_MODE_TYPE: return "StrictMode";
				case REACT_SUSPENSE_TYPE: return "Suspense";
				case REACT_SUSPENSE_LIST_TYPE: return "SuspenseList";
				case REACT_ACTIVITY_TYPE: return "Activity";
				case REACT_VIEW_TRANSITION_TYPE: return "ViewTransition";
			}
			if ("object" === typeof type) switch ("number" === typeof type.tag && console.error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."), type.$$typeof) {
				case REACT_PORTAL_TYPE: return "Portal";
				case REACT_CONTEXT_TYPE: return type.displayName || "Context";
				case REACT_CONSUMER_TYPE: return (type._context.displayName || "Context") + ".Consumer";
				case REACT_FORWARD_REF_TYPE:
					var innerType = type.render;
					type = type.displayName;
					type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
					return type;
				case REACT_MEMO_TYPE: return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
				case REACT_LAZY_TYPE:
					innerType = type._payload;
					type = type._init;
					try {
						return getComponentNameFromType(type(innerType));
					} catch (x) {}
			}
			return null;
		}
		function getTaskName(type) {
			if (type === REACT_FRAGMENT_TYPE) return "<>";
			if ("object" === typeof type && null !== type && type.$$typeof === REACT_LAZY_TYPE) return "<...>";
			try {
				var name = getComponentNameFromType(type);
				return name ? "<" + name + ">" : "<...>";
			} catch (x) {
				return "<...>";
			}
		}
		function getOwner() {
			var dispatcher = ReactSharedInternals.A;
			return null === dispatcher ? null : dispatcher.getOwner();
		}
		function UnknownOwner() {
			return Error("react-stack-top-frame");
		}
		function hasValidKey(config) {
			if (hasOwnProperty.call(config, "key")) {
				var getter = Object.getOwnPropertyDescriptor(config, "key").get;
				if (getter && getter.isReactWarning) return !1;
			}
			return void 0 !== config.key;
		}
		function defineKeyPropWarningGetter(props, displayName) {
			function warnAboutAccessingKey() {
				specialPropKeyWarningShown || (specialPropKeyWarningShown = !0, console.error("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)", displayName));
			}
			warnAboutAccessingKey.isReactWarning = !0;
			Object.defineProperty(props, "key", {
				get: warnAboutAccessingKey,
				configurable: !0
			});
		}
		function elementRefGetterWithDeprecationWarning() {
			var componentName = getComponentNameFromType(this.type);
			didWarnAboutElementRef[componentName] || (didWarnAboutElementRef[componentName] = !0, console.error("Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."));
			componentName = this.props.ref;
			return void 0 !== componentName ? componentName : null;
		}
		function ReactElement(type, key, props, owner, debugStack, debugTask) {
			var refProp = props.ref;
			type = {
				$$typeof: REACT_ELEMENT_TYPE,
				type,
				key,
				props,
				_owner: owner
			};
			null !== (void 0 !== refProp ? refProp : null) ? Object.defineProperty(type, "ref", {
				enumerable: !1,
				get: elementRefGetterWithDeprecationWarning
			}) : Object.defineProperty(type, "ref", {
				enumerable: !1,
				value: null
			});
			type._store = {};
			Object.defineProperty(type._store, "validated", {
				configurable: !1,
				enumerable: !1,
				writable: !0,
				value: 0
			});
			Object.defineProperty(type, "_debugInfo", {
				configurable: !1,
				enumerable: !1,
				writable: !0,
				value: null
			});
			Object.defineProperty(type, "_debugStack", {
				configurable: !1,
				enumerable: !1,
				writable: !0,
				value: debugStack
			});
			Object.defineProperty(type, "_debugTask", {
				configurable: !1,
				enumerable: !1,
				writable: !0,
				value: debugTask
			});
			Object.freeze && (Object.freeze(type.props), Object.freeze(type));
			return type;
		}
		function cloneAndReplaceKey(oldElement, newKey) {
			newKey = ReactElement(oldElement.type, newKey, oldElement.props, oldElement._owner, oldElement._debugStack, oldElement._debugTask);
			oldElement._store && (newKey._store.validated = oldElement._store.validated);
			return newKey;
		}
		function validateChildKeys(node) {
			isValidElement(node) ? node._store && (node._store.validated = 1) : "object" === typeof node && null !== node && node.$$typeof === REACT_LAZY_TYPE && ("fulfilled" === node._payload.status ? isValidElement(node._payload.value) && node._payload.value._store && (node._payload.value._store.validated = 1) : node._store && (node._store.validated = 1));
		}
		function isValidElement(object) {
			return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
		}
		function escape(key) {
			var escaperLookup = {
				"=": "=0",
				":": "=2"
			};
			return "$" + key.replace(/[=:]/g, function(match) {
				return escaperLookup[match];
			});
		}
		function getElementKey(element, index) {
			return "object" === typeof element && null !== element && null != element.key ? (checkKeyStringCoercion(element.key), escape("" + element.key)) : index.toString(36);
		}
		function resolveThenable(thenable) {
			switch (thenable.status) {
				case "fulfilled": return thenable.value;
				case "rejected": throw thenable.reason;
				default: switch ("string" === typeof thenable.status ? thenable.then(noop, noop) : (thenable.status = "pending", thenable.then(function(fulfilledValue) {
					"pending" === thenable.status && (thenable.status = "fulfilled", thenable.value = fulfilledValue);
				}, function(error) {
					"pending" === thenable.status && (thenable.status = "rejected", thenable.reason = error);
				})), thenable.status) {
					case "fulfilled": return thenable.value;
					case "rejected": throw thenable.reason;
				}
			}
			throw thenable;
		}
		function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
			var type = typeof children;
			if ("undefined" === type || "boolean" === type) children = null;
			var invokeCallback = !1;
			if (null === children) invokeCallback = !0;
			else switch (type) {
				case "bigint":
				case "string":
				case "number":
					invokeCallback = !0;
					break;
				case "object": switch (children.$$typeof) {
					case REACT_ELEMENT_TYPE:
					case REACT_PORTAL_TYPE:
						invokeCallback = !0;
						break;
					case REACT_LAZY_TYPE: return invokeCallback = children._init, mapIntoArray(invokeCallback(children._payload), array, escapedPrefix, nameSoFar, callback);
				}
			}
			if (invokeCallback) {
				invokeCallback = children;
				callback = callback(invokeCallback);
				var childKey = "" === nameSoFar ? "." + getElementKey(invokeCallback, 0) : nameSoFar;
				isArrayImpl(callback) ? (escapedPrefix = "", null != childKey && (escapedPrefix = childKey.replace(userProvidedKeyEscapeRegex, "$&/") + "/"), mapIntoArray(callback, array, escapedPrefix, "", function(c) {
					return c;
				})) : null != callback && (isValidElement(callback) && (null != callback.key && (invokeCallback && invokeCallback.key === callback.key || checkKeyStringCoercion(callback.key)), escapedPrefix = cloneAndReplaceKey(callback, escapedPrefix + (null == callback.key || invokeCallback && invokeCallback.key === callback.key ? "" : ("" + callback.key).replace(userProvidedKeyEscapeRegex, "$&/") + "/") + childKey), "" !== nameSoFar && null != invokeCallback && isValidElement(invokeCallback) && null == invokeCallback.key && invokeCallback._store && !invokeCallback._store.validated && (escapedPrefix._store.validated = 2), callback = escapedPrefix), array.push(callback));
				return 1;
			}
			invokeCallback = 0;
			childKey = "" === nameSoFar ? "." : nameSoFar + ":";
			if (isArrayImpl(children)) for (var i = 0; i < children.length; i++) nameSoFar = children[i], type = childKey + getElementKey(nameSoFar, i), invokeCallback += mapIntoArray(nameSoFar, array, escapedPrefix, type, callback);
			else if (i = getIteratorFn(children), "function" === typeof i) for (i === children.entries && (didWarnAboutMaps || console.warn("Using Maps as children is not supported. Use an array of keyed ReactElements instead."), didWarnAboutMaps = !0), children = i.call(children), i = 0; !(nameSoFar = children.next()).done;) nameSoFar = nameSoFar.value, type = childKey + getElementKey(nameSoFar, i++), invokeCallback += mapIntoArray(nameSoFar, array, escapedPrefix, type, callback);
			else if ("object" === type) {
				if ("function" === typeof children.then) return mapIntoArray(resolveThenable(children), array, escapedPrefix, nameSoFar, callback);
				array = String(children);
				throw Error("Objects are not valid as a React child (found: " + ("[object Object]" === array ? "object with keys {" + Object.keys(children).join(", ") + "}" : array) + "). If you meant to render a collection of children, use an array instead.");
			}
			return invokeCallback;
		}
		function mapChildren(children, func, context) {
			if (null == children) return children;
			var result = [], count = 0;
			mapIntoArray(children, result, "", "", function(child) {
				return func.call(context, child, count++);
			});
			return result;
		}
		function lazyInitializer(payload) {
			if (-1 === payload._status) {
				var resolveDebugValue = null, rejectDebugValue = null, ioInfo = payload._ioInfo;
				null != ioInfo && (ioInfo.start = ioInfo.end = performance.now(), ioInfo.value = new Promise(function(resolve, reject) {
					resolveDebugValue = resolve;
					rejectDebugValue = reject;
				}));
				ioInfo = payload._result;
				var thenable = ioInfo();
				thenable.then(function(moduleObject) {
					if (0 === payload._status || -1 === payload._status) {
						payload._status = 1;
						payload._result = moduleObject;
						var _ioInfo = payload._ioInfo;
						if (null != _ioInfo) {
							_ioInfo.end = performance.now();
							var debugValue = null == moduleObject ? void 0 : moduleObject.default;
							resolveDebugValue(debugValue);
							_ioInfo.value.status = "fulfilled";
							_ioInfo.value.value = debugValue;
						}
						void 0 === thenable.status && (thenable.status = "fulfilled", thenable.value = moduleObject);
					}
				}, function(error) {
					if (0 === payload._status || -1 === payload._status) {
						payload._status = 2;
						payload._result = error;
						var _ioInfo2 = payload._ioInfo;
						null != _ioInfo2 && (_ioInfo2.end = performance.now(), _ioInfo2.value.then(noop, noop), rejectDebugValue(error), _ioInfo2.value.status = "rejected", _ioInfo2.value.reason = error);
						void 0 === thenable.status && (thenable.status = "rejected", thenable.reason = error);
					}
				});
				ioInfo = payload._ioInfo;
				if (null != ioInfo) {
					var displayName = thenable.displayName;
					"string" === typeof displayName && (ioInfo.name = displayName);
				}
				-1 === payload._status && (payload._status = 0, payload._result = thenable);
			}
			if (1 === payload._status) return ioInfo = payload._result, void 0 === ioInfo && console.error("lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))\n\nDid you accidentally put curly braces around the import?", ioInfo), "default" in ioInfo || console.error("lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))", ioInfo), ioInfo.default;
			throw payload._result;
		}
		function resolveDispatcher() {
			var dispatcher = ReactSharedInternals.H;
			null === dispatcher && console.error("Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem.");
			return dispatcher;
		}
		function releaseAsyncTransition() {
			ReactSharedInternals.asyncTransitions--;
		}
		function startTransition(scope) {
			var prevTransition = ReactSharedInternals.T, currentTransition = {};
			currentTransition.types = null !== prevTransition ? prevTransition.types : null;
			currentTransition._updatedFibers = /* @__PURE__ */ new Set();
			ReactSharedInternals.T = currentTransition;
			try {
				var returnValue = scope(), onStartTransitionFinish = ReactSharedInternals.S;
				null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
				"object" === typeof returnValue && null !== returnValue && "function" === typeof returnValue.then && (ReactSharedInternals.asyncTransitions++, returnValue.then(releaseAsyncTransition, releaseAsyncTransition), returnValue.then(noop, reportGlobalError));
			} catch (error) {
				reportGlobalError(error);
			} finally {
				null === prevTransition && currentTransition._updatedFibers && (scope = currentTransition._updatedFibers.size, currentTransition._updatedFibers.clear(), 10 < scope && console.warn("Detected a large number of updates inside startTransition. If this is due to a subscription please re-write it to use React provided hooks. Otherwise concurrent mode guarantees are off the table.")), null !== prevTransition && null !== currentTransition.types && (null !== prevTransition.types && prevTransition.types !== currentTransition.types && console.error("We expected inner Transitions to have transferred the outer types set and that you cannot add to the outer Transition while inside the inner.This is a bug in React."), prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
			}
		}
		function addTransitionType(type) {
			var transition = ReactSharedInternals.T;
			if (null !== transition) {
				var transitionTypes = transition.types;
				null === transitionTypes ? transition.types = [type] : -1 === transitionTypes.indexOf(type) && transitionTypes.push(type);
			} else 0 === ReactSharedInternals.asyncTransitions && console.error("addTransitionType can only be called inside a `startTransition()` callback. It must be associated with a specific Transition."), startTransition(addTransitionType.bind(null, type));
		}
		function enqueueTask(task) {
			if (null === enqueueTaskImpl) try {
				var requireString = ("require" + Math.random()).slice(0, 7);
				enqueueTaskImpl = (module && module[requireString]).call(module, "timers").setImmediate;
			} catch (_err) {
				enqueueTaskImpl = function(callback) {
					!1 === didWarnAboutMessageChannel && (didWarnAboutMessageChannel = !0, "undefined" === typeof MessageChannel && console.error("This browser does not have a MessageChannel implementation, so enqueuing tasks via await act(async () => ...) will fail. Please file an issue at https://github.com/facebook/react/issues if you encounter this warning."));
					var channel = new MessageChannel();
					channel.port1.onmessage = callback;
					channel.port2.postMessage(void 0);
				};
			}
			return enqueueTaskImpl(task);
		}
		function aggregateErrors(errors) {
			return 1 < errors.length && "function" === typeof AggregateError ? new AggregateError(errors) : errors[0];
		}
		function popActScope(prevActQueue, prevActScopeDepth) {
			prevActScopeDepth !== actScopeDepth - 1 && console.error("You seem to have overlapping act() calls, this is not supported. Be sure to await previous act() calls before making a new one. ");
			actScopeDepth = prevActScopeDepth;
		}
		function recursivelyFlushAsyncActWork(returnValue, resolve, reject) {
			var queue = ReactSharedInternals.actQueue;
			if (null !== queue) if (0 !== queue.length) try {
				flushActQueue(queue);
				enqueueTask(function() {
					return recursivelyFlushAsyncActWork(returnValue, resolve, reject);
				});
				return;
			} catch (error) {
				ReactSharedInternals.thrownErrors.push(error);
			}
			else ReactSharedInternals.actQueue = null;
			0 < ReactSharedInternals.thrownErrors.length ? (queue = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, reject(queue)) : resolve(returnValue);
		}
		function flushActQueue(queue) {
			if (!isFlushing) {
				isFlushing = !0;
				var i = 0;
				try {
					for (; i < queue.length; i++) {
						var callback = queue[i];
						do {
							ReactSharedInternals.didUsePromise = !1;
							var continuation = callback(!1);
							if (null !== continuation) {
								if (ReactSharedInternals.didUsePromise) {
									queue[i] = callback;
									queue.splice(0, i);
									return;
								}
								callback = continuation;
							} else break;
						} while (1);
					}
					queue.length = 0;
				} catch (error) {
					queue.splice(0, i + 1), ReactSharedInternals.thrownErrors.push(error);
				} finally {
					isFlushing = !1;
				}
			}
		}
		"undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
		var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = Symbol.for("react.activity"), REACT_VIEW_TRANSITION_TYPE = Symbol.for("react.view_transition"), MAYBE_ITERATOR_SYMBOL = Symbol.iterator, didWarnStateUpdateForUnmountedComponent = {}, ReactNoopUpdateQueue = {
			isMounted: function() {
				return !1;
			},
			enqueueForceUpdate: function(publicInstance) {
				warnNoop(publicInstance, "forceUpdate");
			},
			enqueueReplaceState: function(publicInstance) {
				warnNoop(publicInstance, "replaceState");
			},
			enqueueSetState: function(publicInstance) {
				warnNoop(publicInstance, "setState");
			}
		}, assign = Object.assign, emptyObject = {};
		Object.freeze(emptyObject);
		Component.prototype.isReactComponent = {};
		Component.prototype.setState = function(partialState, callback) {
			if ("object" !== typeof partialState && "function" !== typeof partialState && null != partialState) throw Error("takes an object of state variables to update or a function which returns an object of state variables.");
			this.updater.enqueueSetState(this, partialState, callback, "setState");
		};
		Component.prototype.forceUpdate = function(callback) {
			this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
		};
		var deprecatedAPIs = {
			isMounted: ["isMounted", "Instead, make sure to clean up subscriptions and pending requests in componentWillUnmount to prevent memory leaks."],
			replaceState: ["replaceState", "Refactor your code to use setState instead (see https://github.com/facebook/react/issues/3236)."]
		};
		for (fnName in deprecatedAPIs) deprecatedAPIs.hasOwnProperty(fnName) && defineDeprecationWarning(fnName, deprecatedAPIs[fnName]);
		ComponentDummy.prototype = Component.prototype;
		deprecatedAPIs = PureComponent.prototype = new ComponentDummy();
		deprecatedAPIs.constructor = PureComponent;
		assign(deprecatedAPIs, Component.prototype);
		deprecatedAPIs.isPureReactComponent = !0;
		var isArrayImpl = Array.isArray, REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"), ReactSharedInternals = {
			H: null,
			A: null,
			T: null,
			S: null,
			actQueue: null,
			asyncTransitions: 0,
			isBatchingLegacy: !1,
			didScheduleLegacyUpdate: !1,
			didUsePromise: !1,
			thrownErrors: [],
			getCurrentStack: null,
			recentlyCreatedOwnerStacks: 0
		}, hasOwnProperty = Object.prototype.hasOwnProperty, createTask = console.createTask ? console.createTask : function() {
			return null;
		};
		deprecatedAPIs = { react_stack_bottom_frame: function(callStackForError) {
			return callStackForError();
		} };
		var specialPropKeyWarningShown, didWarnAboutOldJSXRuntime;
		var didWarnAboutElementRef = {};
		var unknownOwnerDebugStack = deprecatedAPIs.react_stack_bottom_frame.bind(deprecatedAPIs, UnknownOwner)();
		var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner));
		var didWarnAboutMaps = !1, userProvidedKeyEscapeRegex = /\/+/g, reportGlobalError = "function" === typeof reportError ? reportError : function(error) {
			if ("object" === typeof window && "function" === typeof window.ErrorEvent) {
				var event = new window.ErrorEvent("error", {
					bubbles: !0,
					cancelable: !0,
					message: "object" === typeof error && null !== error && "string" === typeof error.message ? String(error.message) : String(error),
					error
				});
				if (!window.dispatchEvent(event)) return;
			} else if ("object" === typeof process && "function" === typeof process.emit) {
				process.emit("uncaughtException", error);
				return;
			}
			console.error(error);
		}, didWarnAboutMessageChannel = !1, enqueueTaskImpl = null, actScopeDepth = 0, didWarnNoAwaitAct = !1, isFlushing = !1, queueSeveralMicrotasks = "function" === typeof queueMicrotask ? function(callback) {
			queueMicrotask(function() {
				return queueMicrotask(callback);
			});
		} : enqueueTask;
		deprecatedAPIs = Object.freeze({
			__proto__: null,
			c: function(size) {
				return resolveDispatcher().useMemoCache(size);
			}
		});
		var fnName = {
			map: mapChildren,
			forEach: function(children, forEachFunc, forEachContext) {
				mapChildren(children, function() {
					forEachFunc.apply(this, arguments);
				}, forEachContext);
			},
			count: function(children) {
				var n = 0;
				mapChildren(children, function() {
					n++;
				});
				return n;
			},
			toArray: function(children) {
				return mapChildren(children, function(child) {
					return child;
				}) || [];
			},
			only: function(children) {
				if (!isValidElement(children)) throw Error("React.Children.only expected to receive a single React element child.");
				return children;
			}
		};
		exports.Activity = REACT_ACTIVITY_TYPE;
		exports.Children = fnName;
		exports.Component = Component;
		exports.Fragment = REACT_FRAGMENT_TYPE;
		exports.Profiler = REACT_PROFILER_TYPE;
		exports.PureComponent = PureComponent;
		exports.StrictMode = REACT_STRICT_MODE_TYPE;
		exports.Suspense = REACT_SUSPENSE_TYPE;
		exports.ViewTransition = REACT_VIEW_TRANSITION_TYPE;
		exports.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = ReactSharedInternals;
		exports.__COMPILER_RUNTIME = deprecatedAPIs;
		exports.act = function(callback) {
			var prevActQueue = ReactSharedInternals.actQueue, prevActScopeDepth = actScopeDepth;
			actScopeDepth++;
			var queue = ReactSharedInternals.actQueue = null !== prevActQueue ? prevActQueue : [], didAwaitActCall = !1;
			try {
				var result = callback();
			} catch (error) {
				ReactSharedInternals.thrownErrors.push(error);
			}
			if (0 < ReactSharedInternals.thrownErrors.length) throw popActScope(prevActQueue, prevActScopeDepth), callback = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, callback;
			if (null !== result && "object" === typeof result && "function" === typeof result.then) {
				var thenable = result;
				queueSeveralMicrotasks(function() {
					didAwaitActCall || didWarnNoAwaitAct || (didWarnNoAwaitAct = !0, console.error("You called act(async () => ...) without await. This could lead to unexpected testing behaviour, interleaving multiple act calls and mixing their scopes. You should - await act(async () => ...);"));
				});
				return { then: function(resolve, reject) {
					didAwaitActCall = !0;
					thenable.then(function(returnValue) {
						popActScope(prevActQueue, prevActScopeDepth);
						if (0 === prevActScopeDepth) {
							try {
								flushActQueue(queue), enqueueTask(function() {
									return recursivelyFlushAsyncActWork(returnValue, resolve, reject);
								});
							} catch (error$0) {
								ReactSharedInternals.thrownErrors.push(error$0);
							}
							if (0 < ReactSharedInternals.thrownErrors.length) {
								var _thrownError = aggregateErrors(ReactSharedInternals.thrownErrors);
								ReactSharedInternals.thrownErrors.length = 0;
								reject(_thrownError);
							}
						} else resolve(returnValue);
					}, function(error) {
						popActScope(prevActQueue, prevActScopeDepth);
						0 < ReactSharedInternals.thrownErrors.length ? (error = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, reject(error)) : reject(error);
					});
				} };
			}
			var returnValue$jscomp$0 = result;
			popActScope(prevActQueue, prevActScopeDepth);
			0 === prevActScopeDepth && (flushActQueue(queue), 0 !== queue.length && queueSeveralMicrotasks(function() {
				didAwaitActCall || didWarnNoAwaitAct || (didWarnNoAwaitAct = !0, console.error("A component suspended inside an `act` scope, but the `act` call was not awaited. When testing React components that depend on asynchronous data, you must await the result:\n\nawait act(() => ...)"));
			}), ReactSharedInternals.actQueue = null);
			if (0 < ReactSharedInternals.thrownErrors.length) throw callback = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, callback;
			return { then: function(resolve, reject) {
				didAwaitActCall = !0;
				0 === prevActScopeDepth ? (ReactSharedInternals.actQueue = queue, enqueueTask(function() {
					return recursivelyFlushAsyncActWork(returnValue$jscomp$0, resolve, reject);
				})) : resolve(returnValue$jscomp$0);
			} };
		};
		exports.addTransitionType = addTransitionType;
		exports.cache = function(fn) {
			return function() {
				return fn.apply(null, arguments);
			};
		};
		exports.cacheSignal = function() {
			return null;
		};
		exports.captureOwnerStack = function() {
			var getCurrentStack = ReactSharedInternals.getCurrentStack;
			return null === getCurrentStack ? null : getCurrentStack();
		};
		exports.cloneElement = function(element, config, children) {
			if (null === element || void 0 === element) throw Error("The argument must be a React element, but you passed " + element + ".");
			var props = assign({}, element.props), key = element.key, owner = element._owner;
			if (null != config) {
				var JSCompiler_inline_result;
				a: {
					if (hasOwnProperty.call(config, "ref") && (JSCompiler_inline_result = Object.getOwnPropertyDescriptor(config, "ref").get) && JSCompiler_inline_result.isReactWarning) {
						JSCompiler_inline_result = !1;
						break a;
					}
					JSCompiler_inline_result = void 0 !== config.ref;
				}
				JSCompiler_inline_result && (owner = getOwner());
				hasValidKey(config) && (checkKeyStringCoercion(config.key), key = "" + config.key);
				for (propName in config) !hasOwnProperty.call(config, propName) || "key" === propName || "__self" === propName || "__source" === propName || "ref" === propName && void 0 === config.ref || (props[propName] = config[propName]);
			}
			var propName = arguments.length - 2;
			if (1 === propName) props.children = children;
			else if (1 < propName) {
				JSCompiler_inline_result = Array(propName);
				for (var i = 0; i < propName; i++) JSCompiler_inline_result[i] = arguments[i + 2];
				props.children = JSCompiler_inline_result;
			}
			props = ReactElement(element.type, key, props, owner, element._debugStack, element._debugTask);
			for (key = 2; key < arguments.length; key++) validateChildKeys(arguments[key]);
			return props;
		};
		exports.createContext = function(defaultValue) {
			defaultValue = {
				$$typeof: REACT_CONTEXT_TYPE,
				_currentValue: defaultValue,
				_currentValue2: defaultValue,
				_threadCount: 0,
				Provider: null,
				Consumer: null
			};
			defaultValue.Provider = defaultValue;
			defaultValue.Consumer = {
				$$typeof: REACT_CONSUMER_TYPE,
				_context: defaultValue
			};
			defaultValue._currentRenderer = null;
			defaultValue._currentRenderer2 = null;
			return defaultValue;
		};
		exports.createElement = function(type, config, children) {
			for (var i = 2; i < arguments.length; i++) validateChildKeys(arguments[i]);
			var propName;
			i = {};
			var key = null;
			if (null != config) for (propName in didWarnAboutOldJSXRuntime || !("__self" in config) || "key" in config || (didWarnAboutOldJSXRuntime = !0, console.warn("Your app (or one of its dependencies) is using an outdated JSX transform. Update to the modern JSX transform for faster performance: https://react.dev/link/new-jsx-transform")), hasValidKey(config) && (checkKeyStringCoercion(config.key), key = "" + config.key), config) hasOwnProperty.call(config, propName) && "key" !== propName && "__self" !== propName && "__source" !== propName && (i[propName] = config[propName]);
			var childrenLength = arguments.length - 2;
			if (1 === childrenLength) i.children = children;
			else if (1 < childrenLength) {
				for (var childArray = Array(childrenLength), _i = 0; _i < childrenLength; _i++) childArray[_i] = arguments[_i + 2];
				Object.freeze && Object.freeze(childArray);
				i.children = childArray;
			}
			if (type && type.defaultProps) for (propName in childrenLength = type.defaultProps, childrenLength) void 0 === i[propName] && (i[propName] = childrenLength[propName]);
			key && defineKeyPropWarningGetter(i, "function" === typeof type ? type.displayName || type.name || "Unknown" : type);
			(propName = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++) ? (childArray = Error.stackTraceLimit, Error.stackTraceLimit = 10, childrenLength = Error("react-stack-top-frame"), Error.stackTraceLimit = childArray) : childrenLength = unknownOwnerDebugStack;
			return ReactElement(type, key, i, getOwner(), childrenLength, propName ? createTask(getTaskName(type)) : unknownOwnerDebugTask);
		};
		exports.createRef = function() {
			var refObject = { current: null };
			Object.seal(refObject);
			return refObject;
		};
		exports.forwardRef = function(render) {
			null != render && render.$$typeof === REACT_MEMO_TYPE ? console.error("forwardRef requires a render function but received a `memo` component. Instead of forwardRef(memo(...)), use memo(forwardRef(...)).") : "function" !== typeof render ? console.error("forwardRef requires a render function but was given %s.", null === render ? "null" : typeof render) : 0 !== render.length && 2 !== render.length && console.error("forwardRef render functions accept exactly two parameters: props and ref. %s", 1 === render.length ? "Did you forget to use the ref parameter?" : "Any additional parameter will be undefined.");
			null != render && null != render.defaultProps && console.error("forwardRef render functions do not support defaultProps. Did you accidentally pass a React component?");
			var elementType = {
				$$typeof: REACT_FORWARD_REF_TYPE,
				render
			}, ownName;
			Object.defineProperty(elementType, "displayName", {
				enumerable: !1,
				configurable: !0,
				get: function() {
					return ownName;
				},
				set: function(name) {
					ownName = name;
					render.name || render.displayName || (Object.defineProperty(render, "name", { value: name }), render.displayName = name);
				}
			});
			return elementType;
		};
		exports.isValidElement = isValidElement;
		exports.lazy = function(ctor) {
			ctor = {
				_status: -1,
				_result: ctor
			};
			var lazyType = {
				$$typeof: REACT_LAZY_TYPE,
				_payload: ctor,
				_init: lazyInitializer
			}, ioInfo = {
				name: "lazy",
				start: -1,
				end: -1,
				value: null,
				owner: null,
				debugStack: Error("react-stack-top-frame"),
				debugTask: console.createTask ? console.createTask("lazy()") : null
			};
			ctor._ioInfo = ioInfo;
			lazyType._debugInfo = [{ awaited: ioInfo }];
			return lazyType;
		};
		exports.memo = function(type, compare) {
			type ?? console.error("memo: The first argument must be a component. Instead received: %s", null === type ? "null" : typeof type);
			compare = {
				$$typeof: REACT_MEMO_TYPE,
				type,
				compare: void 0 === compare ? null : compare
			};
			var ownName;
			Object.defineProperty(compare, "displayName", {
				enumerable: !1,
				configurable: !0,
				get: function() {
					return ownName;
				},
				set: function(name) {
					ownName = name;
					type.name || type.displayName || (Object.defineProperty(type, "name", { value: name }), type.displayName = name);
				}
			});
			return compare;
		};
		exports.startTransition = startTransition;
		exports.unstable_useCacheRefresh = function() {
			return resolveDispatcher().useCacheRefresh();
		};
		exports.use = function(usable) {
			return resolveDispatcher().use(usable);
		};
		exports.useActionState = function(action, initialState, permalink) {
			return resolveDispatcher().useActionState(action, initialState, permalink);
		};
		exports.useCallback = function(callback, deps) {
			return resolveDispatcher().useCallback(callback, deps);
		};
		exports.useContext = function(Context) {
			var dispatcher = resolveDispatcher();
			Context.$$typeof === REACT_CONSUMER_TYPE && console.error("Calling useContext(Context.Consumer) is not supported and will cause bugs. Did you mean to call useContext(Context) instead?");
			return dispatcher.useContext(Context);
		};
		exports.useDebugValue = function(value, formatterFn) {
			return resolveDispatcher().useDebugValue(value, formatterFn);
		};
		exports.useDeferredValue = function(value, initialValue) {
			return resolveDispatcher().useDeferredValue(value, initialValue);
		};
		exports.useEffect = function(create, deps) {
			create ?? console.warn("React Hook useEffect requires an effect callback. Did you forget to pass a callback to the hook?");
			return resolveDispatcher().useEffect(create, deps);
		};
		exports.useEffectEvent = function(callback) {
			return resolveDispatcher().useEffectEvent(callback);
		};
		exports.useId = function() {
			return resolveDispatcher().useId();
		};
		exports.useImperativeHandle = function(ref, create, deps) {
			return resolveDispatcher().useImperativeHandle(ref, create, deps);
		};
		exports.useInsertionEffect = function(create, deps) {
			create ?? console.warn("React Hook useInsertionEffect requires an effect callback. Did you forget to pass a callback to the hook?");
			return resolveDispatcher().useInsertionEffect(create, deps);
		};
		exports.useLayoutEffect = function(create, deps) {
			create ?? console.warn("React Hook useLayoutEffect requires an effect callback. Did you forget to pass a callback to the hook?");
			return resolveDispatcher().useLayoutEffect(create, deps);
		};
		exports.useMemo = function(create, deps) {
			return resolveDispatcher().useMemo(create, deps);
		};
		exports.useOptimistic = function(passthrough, reducer) {
			return resolveDispatcher().useOptimistic(passthrough, reducer);
		};
		exports.useReducer = function(reducer, initialArg, init) {
			return resolveDispatcher().useReducer(reducer, initialArg, init);
		};
		exports.useRef = function(initialValue) {
			return resolveDispatcher().useRef(initialValue);
		};
		exports.useState = function(initialState) {
			return resolveDispatcher().useState(initialState);
		};
		exports.useSyncExternalStore = function(subscribe, getSnapshot, getServerSnapshot) {
			return resolveDispatcher().useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
		};
		exports.useTransition = function() {
			return resolveDispatcher().useTransition();
		};
		exports.version = "19.3.0";
		"undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
	})();
}));
(/* @__PURE__ */ __commonJSMin(((exports, module) => {
	if (process.env.NODE_ENV === "production") module.exports = require_react_production();
	else module.exports = require_react_development();
})))();
const DEFAULT_AISLES = [
	"hortifruti",
	"padaria",
	"mercearia",
	"matinais",
	"temperos",
	"besteiras",
	"bebidas",
	"limpeza",
	"higiene",
	"casa",
	"pet",
	"frios",
	"acougue",
	"congelados",
	"outros"
];
/** Lojas iniciais. A chave vira o id. */
const SEED_SHOPS = [
	{
		key: "atacadao",
		name: "Atacadão",
		emoji: "🛒"
	},
	{
		key: "hortifruti",
		name: "Quitanda / sacolão",
		emoji: "🥕"
	},
	{
		key: "mercadinho",
		name: "Mercadinho do bairro",
		emoji: "🏪"
	}
];
const s = (key, name, category, place, unit, qty, o = {}) => ({
	key,
	name,
	category,
	place,
	unit,
	qty,
	shop: o.shop ?? "atacadao",
	origin: o.origin ?? "lista",
	every: o.every,
	note: o.note,
	pairs: o.pairs
});
const falta = (o = {}) => ({
	...o,
	origin: "falta"
});
const variar = (note, o = {}) => ({
	...o,
	origin: "variar",
	note
});
/**
* Catálogo montado a partir das listas de 29/05, 30/07 e 31/08/2026.
* Quantidade = média das listas, arredondada. Itens duráveis (sal, açúcar…)
* ficam marcados como "a cada X meses" pra não pesar na lista de todo mês.
*/
const SEED_ITEMS = [
	s("arroz", "Arroz (1 kg)", "mercearia", "armario", "pct", 4, { pairs: ["feijao"] }),
	s("feijao", "Feijão (1 kg)", "mercearia", "armario", "pct", 2, {
		note: "carioca ou preto",
		pairs: ["arroz"]
	}),
	s("macarrao-ninho", "Macarrão ninho", "mercearia", "armario", "pct", 2, { pairs: ["extrato-tomate", "queijo-ralado"] }),
	s("macarrao-espaguete", "Macarrão espaguete", "mercearia", "armario", "pct", 2, { pairs: ["extrato-tomate", "queijo-ralado"] }),
	s("cuscuz", "Flocão de milho (cuscuz)", "mercearia", "armario", "pct", 2),
	s("farinha-mandioca", "Farinha de mandioca", "mercearia", "armario", "pct", 1, { every: 2 }),
	s("acucar", "Açúcar (1 kg)", "mercearia", "armario", "pct", 1, { every: 2 }),
	s("sal", "Sal (1 kg)", "mercearia", "armario", "pct", 1, { every: 6 }),
	s("fermento", "Fermento em pó", "mercearia", "armario", "un", 1, { every: 3 }),
	s("farinha-trigo", "Farinha de trigo", "mercearia", "armario", "pct", 1, falta({
		every: 2,
		note: "pra empanar e bolos"
	})),
	s("milho-lata", "Milho em lata", "congelados", "armario", "lata", 1, { pairs: ["ervilha-lata"] }),
	s("ervilha-lata", "Ervilha em lata", "congelados", "armario", "lata", 1, { pairs: ["milho-lata"] }),
	s("file-peito", "Filé de peito de frango", "acougue", "freezer", "kg", 3, { note: "grelhar, empanar ou desfiar" }),
	s("coxinha-asa", "Coxinha da asa", "acougue", "freezer", "kg", 1, { note: "airfryer" }),
	s("coxa-sobrecoxa", "Coxa e sobrecoxa", "acougue", "freezer", "kg", 1),
	s("carne-moida", "Carne moída (coxão mole)", "acougue", "freezer", "kg", 1.5, { note: "nem a nobre nem a de segunda" }),
	s("patinho", "Patinho (bife ou assado)", "acougue", "freezer", "kg", 1),
	s("cupim", "Cupim", "acougue", "freezer", "kg", 1, { note: "mais gordura, fica macio na pressão" }),
	s("acem", "Acém (pressão/guisado)", "acougue", "freezer", "kg", 1.5),
	s("coxao-mole", "Coxão mole (bife)", "acougue", "freezer", "kg", 1),
	s("lombo", "Lombo suíno", "acougue", "freezer", "kg", 1),
	s("linguica", "Linguiça de porco", "acougue", "freezer", "kg", 1),
	s("bacon", "Bacon", "acougue", "geladeira", "kg", .3, { note: "por peso" }),
	s("salsicha", "Salsicha", "acougue", "geladeira", "kg", 1, {
		note: "por peso",
		pairs: ["pao-hotdog"]
	}),
	s("tilapia", "Filé de tilápia", "acougue", "freezer", "kg", 1, {
		origin: "variar",
		note: "vocês enjoaram: deixei desmarcado"
	}),
	s("merluza", "Filé de merluza", "acougue", "freezer", "kg", 1, variar("peixe mais barato que tilápia")),
	s("musculo", "Músculo", "acougue", "freezer", "kg", 1, variar("barato; na pressão desfia e rende 3 refeições")),
	s("peito-osso", "Peito de frango com osso", "acougue", "freezer", "kg", 1.5, variar("mais barato que filé, ótimo pra desfiar")),
	s("sobrecoxa-desossada", "Sobrecoxa desossada", "acougue", "freezer", "kg", 1, variar("suculenta na airfryer, mais barata que filé")),
	s("pernil", "Pernil suíno", "acougue", "freezer", "kg", 1.5, variar("assado rende almoço + sanduíche no pão de forma")),
	s("carne-sol", "Carne de sol / charque", "acougue", "geladeira", "kg", .5, variar("pouca quantidade dá muito sabor (cuscuz, arroz, farofa)")),
	s("figado", "Fígado bovino", "acougue", "freezer", "kg", .5, variar("muito barato e acebolado fica ótimo")),
	s("ovos", "Ovos (bandeja de 30)", "frios", "geladeira", "bandeja", 2),
	s("leite", "Leite (caixa de 1 L)", "frios", "armario", "cx", 4),
	s("creme-leite", "Creme de leite", "frios", "armario", "cx", 4),
	s("queijo-ralado", "Queijo ralado", "frios", "geladeira", "pct", 1),
	s("margarina", "Margarina (pote de 1 kg)", "frios", "geladeira", "un", 1, { note: "uma só, da boa; às vezes o de 500 g" }),
	s("queijo-prato", "Queijo prato / mussarela", "frios", "geladeira", "kg", .3, { pairs: ["presunto"] }),
	s("presunto", "Presunto", "frios", "geladeira", "kg", .2, { pairs: ["queijo-prato"] }),
	s("requeijao", "Requeijão", "frios", "geladeira", "un", 1, variar("com frango desfiado vira recheio de pão de forma")),
	s("iogurte", "Iogurte (garrafa de 1 L)", "frios", "geladeira", "un", 1, variar("a garrafa sai bem mais barata que os potinhos")),
	s("queijo-coalho", "Queijo coalho", "frios", "geladeira", "kg", .3, { note: "por peso" }),
	s("tomate", "Tomate", "hortifruti", "fruteira", "un", 6, { note: "se estiver feio, pega na quitanda" }),
	s("cebola", "Cebola", "hortifruti", "fruteira", "un", 3, { note: "se estiver feia, pega na quitanda" }),
	s("batata", "Batata", "hortifruti", "fruteira", "kg", 2),
	s("cenoura", "Cenoura", "hortifruti", "geladeira", "un", 3),
	s("alface", "Alface", "hortifruti", "geladeira", "pé", 1),
	s("coentro", "Coentro", "hortifruti", "geladeira", "maço", 1),
	s("cebolinha", "Cebolinha", "hortifruti", "geladeira", "maço", 1),
	s("alho", "Alho (cabeças)", "hortifruti", "armario", "un", 4, { note: "vende por quilo: pega no olho e vê o preço no caixa" }),
	s("banana", "Banana", "hortifruti", "fruteira", "cacho", 1),
	s("laranja", "Laranja", "hortifruti", "fruteira", "kg", 2),
	s("uva", "Uva", "hortifruti", "geladeira", "kg", 1),
	s("morango", "Morango", "hortifruti", "geladeira", "cx", 1, {
		origin: "variar",
		note: "só em datas especiais"
	}),
	s("limao", "Limão", "hortifruti", "fruteira", "un", 6, falta()),
	s("pimentao", "Pimentão", "hortifruti", "geladeira", "un", 2, falta({ note: "base de refogado e carne moída" })),
	s("pao-forma", "Pão de forma", "padaria", "armario", "pct", 2, { note: "da marca que vocês gostaram" }),
	s("pao-artesanal", "Pão artesanal", "padaria", "armario", "un", 1),
	s("torrada", "Torrada", "padaria", "armario", "pct", 1),
	s("pao-hotdog", "Pão de cachorro-quente", "padaria", "armario", "pct", 1, { pairs: ["salsicha"] }),
	s("tapioca", "Goma de tapioca", "padaria", "geladeira", "pct", 1, variar("mais barata que wrap e sustenta")),
	s("azeite", "Azeite", "temperos", "armario", "un", 1),
	s("sazon", "Sazón (caixa de sachês)", "temperos", "armario", "cx", 1),
	s("paprica", "Páprica", "temperos", "armario", "pct", 1, { every: 3 }),
	s("oregano", "Orégano", "temperos", "armario", "pct", 1, { every: 3 }),
	s("chimichurri", "Chimichurri", "temperos", "armario", "pct", 1, { every: 3 }),
	s("lemon-pepper", "Lemon pepper", "temperos", "armario", "pct", 1, { every: 3 }),
	s("extrato-tomate", "Extrato de tomate", "temperos", "armario", "un", 1),
	s("maionese", "Maionese (refil 200 g)", "temperos", "geladeira", "un", 1),
	s("ketchup", "Ketchup", "temperos", "geladeira", "un", 1, {
		every: 2,
		note: "escolher um tamanho padrão"
	}),
	s("oleo", "Óleo", "temperos", "armario", "un", 1, falta({ note: "não estava nas listas: vocês fritam bastante" })),
	s("molho-tomate", "Molho de tomate pronto", "temperos", "armario", "un", 2, falta()),
	s("shoyu", "Shoyu", "temperos", "armario", "un", 1, variar("marinar frango e fazer carne acebolada", { every: 3 })),
	s("batata-frita", "Batata frita congelada", "congelados", "freezer", "pct", 1),
	s("batata-palha", "Batata palha", "congelados", "armario", "pct", 1, { note: "pequena ou grande, a que compensar" }),
	s("sardinha", "Sardinha em lata", "congelados", "armario", "lata", 2),
	s("nescau", "Nescau (pacote grande)", "matinais", "armario", "pct", 1, { note: "lata sai mais cara" }),
	s("cafe", "Café", "matinais", "armario", "pct", 1, falta()),
	s("polpa", "Polpa de fruta (Canaã)", "bebidas", "freezer", "pct", 2, { note: "pacote com vários saquinhos" }),
	s("salgadinho", "Salgadinho", "besteiras", "armario", "pct", 3),
	s("chocolate", "Bis ou bombom", "besteiras", "armario", "un", 1),
	s("pipoca", "Pipoca de micro-ondas", "besteiras", "armario", "un", 4),
	s("detergente", "Detergente", "limpeza", "limpeza", "un", 4, { pairs: ["esponja"] }),
	s("amaciante", "Amaciante (refil)", "limpeza", "limpeza", "un", 1, { pairs: ["sabao-liquido"] }),
	s("sabao-liquido", "Sabão líquido (refil)", "limpeza", "limpeza", "un", 1, {
		note: "olhar preço na Amazon também",
		pairs: ["amaciante"]
	}),
	s("agua-sanitaria", "Água sanitária", "limpeza", "limpeza", "L", 2, { note: "garrafas de 1 L ou uma de 2 L, a que compensar" }),
	s("cif", "Cif (limpador cremoso)", "limpeza", "limpeza", "un", 1, { every: 2 }),
	s("bombril", "Bombril", "limpeza", "limpeza", "pct", 1, { every: 2 }),
	s("saco-lixo", "Saco de lixo", "limpeza", "limpeza", "rolo", 1),
	s("baygon", "Baygon", "limpeza", "limpeza", "un", 1, { every: 3 }),
	s("esponja", "Esponja (pacote com 4)", "limpeza", "limpeza", "pct", 1, { pairs: ["detergente"] }),
	s("desinfetante", "Desinfetante", "limpeza", "limpeza", "un", 1, falta()),
	s("papel-aluminio", "Papel alumínio", "casa", "armario", "rolo", 2, { every: 2 }),
	s("papel-filme", "Papel filme", "casa", "armario", "rolo", 1, { every: 3 }),
	s("papel-toalha", "Papel toalha", "casa", "armario", "rolo", 2),
	s("saquinho-freezer", "Saquinhos pra congelar", "casa", "armario", "pct", 1, variar("pra porcionar a carne e fazer durar o mês", { every: 2 })),
	s("papel-higienico", "Papel higiênico (12 rolos)", "higiene", "banheiro", "pct", 1),
	s("cotonete", "Cotonete", "higiene", "banheiro", "cx", 1),
	s("pasta-dente", "Pasta de dente", "higiene", "banheiro", "un", 1),
	s("escova-dente", "Escova de dentes", "higiene", "banheiro", "un", 1, { every: 3 }),
	s("desodorante", "Desodorante Dove", "higiene", "banheiro", "un", 2),
	s("sabonete-intimo", "Sabonete íntimo", "higiene", "banheiro", "un", 1),
	s("aparelho-barbear", "Aparelho de barbear", "higiene", "banheiro", "pct", 1, { every: 2 }),
	s("lenco-umedecido", "Lenço umedecido", "higiene", "banheiro", "pct", 1),
	s("sabonete", "Sabonete", "higiene", "banheiro", "un", 4, falta()),
	s("shampoo", "Shampoo", "higiene", "banheiro", "un", 1, falta({ pairs: ["condicionador"] })),
	s("condicionador", "Condicionador", "higiene", "banheiro", "un", 1, falta({ pairs: ["shampoo"] }))
];
/** Palpite de categoria pelo nome, para itens que a pessoa cria na hora. */
const HINTS = [
	[
		/creme de leite|leite condensado|leite de coco/i,
		"mercearia",
		"armario"
	],
	[
		/fruta|verdura|legume|tomate|cebola|batata|alface|banana|ma[çc][ãa]|laranja|lim[ãa]o|abacate|mam[ãa]o|melancia|uva|piment|couve|coentro|cheiro|alho|ab[óo]bora|chuchu|pepino/i,
		"hortifruti",
		"fruteira"
	],
	[
		/carne|frango|peixe|lingui|bacon|costela|picanha|alcatra|patinho|fil[ée]/i,
		"acougue",
		"freezer"
	],
	[
		/queijo|presunto|iogurte|requeij|manteiga|margarina|leite fermentado|ovo|nata/i,
		"frios",
		"geladeira"
	],
	[
		/p[ãa]o|bolo|torrada/i,
		"padaria",
		"armario"
	],
	[
		/caf[ée]|leite|achocolatado|aveia|granola|cereal|biscoito|bolacha|tapioca|cuscuz|geleia/i,
		"matinais",
		"armario"
	],
	[
		/\bsal\b|tempero|molho|ketchup|maionese|mostarda|vinagre|or[ée]gano|colorau|pimenta do reino|shoyu/i,
		"temperos",
		"armario"
	],
	[
		/[áa]gua|refri|suco|cerveja|vinho|coca|guaran/i,
		"bebidas",
		"armario"
	],
	[
		/congelad|lasanha|pizza|nugget|sorvete|hamb[úu]rguer/i,
		"congelados",
		"freezer"
	],
	[
		/chocolate|salgadinho|doce|bala|chiclete|pipoca|bis\b|wafer/i,
		"besteiras",
		"armario"
	],
	[
		/detergente|sab[ãa]o|amaciante|sanit[áa]ria|desinfet|limpador|esponja|lixo|vassoura|pano|[áa]lcool|lustra|cloro|veja|ypê/i,
		"limpeza",
		"limpeza"
	],
	[
		/papel higi|sabonete|shampoo|condicionador|pasta de dente|escova|desodorante|absorvente|fio dental|cotonete|creme|barbear/i,
		"higiene",
		"banheiro"
	],
	[
		/ra[çc][ãa]o|areia|pet|petisco/i,
		"pet",
		"outros"
	],
	[
		/arroz|feij[ãa]o|macarr[ãa]o|a[çc][úu]car|farinha|[óo]leo|azeite|milho|atum|sardinha|creme de leite|condensado|fub[áa]|lentilha|gr[ãa]o/i,
		"mercearia",
		"armario"
	]
];
function guessCategory(name) {
	for (const [re, category, place] of HINTS) if (re.test(name)) return {
		category,
		place
	};
	return {
		category: "outros",
		place: "armario"
	};
}
new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL"
});
const normalize = (s) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
const DAY = 864e5;
//#endregion
//#region src/data/logic.ts
function finishedTrips(db) {
	return Object.values(db.trips).filter((t) => !t.deleted && t.finishedAt != null).sort((a, b) => a.finishedAt - b.finishedAt);
}
function purchasesOf(db, itemId) {
	const out = [];
	for (const t of finishedTrips(db)) for (const l of t.lines) if (l.itemId === itemId && l.status === "pego") out.push({
		at: t.finishedAt,
		qty: l.qty,
		unitPrice: l.unitPrice,
		shopId: t.shopId,
		tripId: t.id,
		kind: t.kind,
		extra: l.extra
	});
	return out;
}
/** Consumo por dia. Com pouco histórico, assume que a compra padrão dura um mês. */
function dailyRate(db, item) {
	const ps = purchasesOf(db, item.id).filter((p) => p.at > Date.now() - 365 * DAY);
	if (ps.length >= 2) {
		const span = (ps[ps.length - 1].at - ps[0].at) / DAY;
		if (span >= 20) return ps.slice(0, -1).reduce((s, p) => s + p.qty, 0) / span;
	}
	return Math.max(item.defaultQty, .1) / (30 * (item.everyMonths ?? 1));
}
function estimateStock(db, item, now = Date.now()) {
	if (item.stockQty == null || item.stockAt == null) return null;
	const days = Math.max(0, (now - item.stockAt) / DAY);
	return Math.max(0, item.stockQty - dailyRate(db, item) * days);
}
/** Quanto comprar: o que a casa gasta até a feira seguinte, menos o que ainda tem. */
function suggestBuyQty(db, item) {
	const est = estimateStock(db, item) ?? 0;
	const need = item.defaultQty - est;
	if (need <= 0) return item.defaultQty;
	if (item.unit === "kg" || item.unit === "L") return Math.max(+need.toFixed(1), .5);
	return Math.max(1, Math.ceil(need));
}
//#endregion
//#region src/data/store.ts
const KEY$1 = "feirinha:v1";
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
function emptyDB() {
	const now = Date.now();
	const shops = {};
	for (const s of SEED_SHOPS) shops[s.key] = {
		id: s.key,
		name: s.name,
		emoji: s.emoji,
		aisles: [...DEFAULT_AISLES],
		updatedAt: now
	};
	return {
		version: 1,
		items: {},
		shops,
		list: {},
		trips: {},
		recipes: {},
		settings: {
			me: "",
			people: [],
			ticketMonthly: 0,
			ticketDay: 5,
			onboarded: false
		}
	};
}
function load() {
	try {
		const raw = localStorage.getItem(KEY$1);
		if (raw) return {
			...emptyDB(),
			...JSON.parse(raw)
		};
	} catch {}
	return emptyDB();
}
let db = load();
const listeners = /* @__PURE__ */ new Set();
function emit() {
	for (const l of listeners) l();
}
function save() {
	try {
		localStorage.setItem(KEY$1, JSON.stringify(db));
	} catch {}
}
if (typeof window !== "undefined") window.addEventListener("storage", (e) => {
	if (e.key === KEY$1) {
		db = load();
		emit();
	}
});
/** Usado pelo servidor (atalhos da Siri): carrega a casa inteira vinda do banco. */
function setDB(next) {
	db = next;
}
function getDB() {
	return db;
}
const commitListeners = /* @__PURE__ */ new Set();
/** Avisado a cada mudança feita neste celular (a sincronização usa pra saber o que enviar). */
function onCommit(l) {
	commitListeners.add(l);
	return () => commitListeners.delete(l);
}
/** Ajustes que valem pra casa toda (o nome de quem usa o celular fica só nele). */
function sharedSettings(s) {
	const { me: _me, updatedAt: _u, ...rest } = s;
	return rest;
}
function commit(mutate) {
	const prev = db;
	const next = structuredClone(db);
	mutate(next);
	if (JSON.stringify(sharedSettings(prev.settings)) !== JSON.stringify(sharedSettings(next.settings))) next.settings.updatedAt = Date.now();
	db = next;
	save();
	emit();
	for (const l of commitListeners) l(prev, next);
}
const touch = (r) => {
	r.updatedAt = Date.now();
	return r;
};
const COLLS = [
	"items",
	"shops",
	"list",
	"trips",
	"recipes"
];
/**
* Roda uma ação e devolve uma função que desfaz exatamente o que ela mudou
* (volta os registros pro estado anterior, com updatedAt novo pra sincronizar).
*/
function undoable(fn) {
	const before = db;
	fn();
	const after = db;
	const changed = [];
	for (const c of COLLS) {
		const a = before[c];
		const b = after[c];
		for (const id in b) if (!a[id] || a[id].updatedAt !== b[id].updatedAt) changed.push([c, id]);
	}
	return () => commit((d) => {
		const now = Date.now();
		for (const [c, id] of changed) {
			const coll = d[c];
			const prev = before[c][id];
			if (prev) coll[id] = {
				...structuredClone(prev),
				updatedAt: now
			};
			else if (coll[id]) Object.assign(coll[id], {
				deleted: true,
				updatedAt: now
			});
		}
	});
}
function createItem(d, name, patch = {}) {
	const guess = guessCategory(name);
	const item = {
		id: uid(),
		name: name.trim(),
		category: guess.category,
		place: guess.place,
		unit: "un",
		defaultQty: 1,
		shopId: guess.category === "hortifruti" && d.shops.hortifruti ? "hortifruti" : firstShopId(d),
		pairs: [],
		stockQty: null,
		stockAt: null,
		updatedAt: Date.now(),
		...patch
	};
	d.items[item.id] = item;
	return item;
}
function firstShopId(d) {
	return Object.values(d.shops).find((s) => !s.deleted)?.id ?? "atacadao";
}
function addItem(name, patch = {}) {
	let created;
	commit((d) => {
		created = createItem(d, name, patch);
	});
	return created;
}
const STOP = /* @__PURE__ */ new Set([
	"de",
	"da",
	"do",
	"das",
	"dos",
	"com",
	"e",
	"o",
	"a",
	"pra",
	"para",
	"tb",
	"tambem",
	"ou",
	"um",
	"uma"
]);
const PACK = /^(bandejas?|pacotes?|pcts?|caixas?|cxs?|latas?|rolos?|macos?|pes?|cachos?|duzias?|dz|un|und|unid|unidades?|kg|g|l|litros?|gramas?|quilos?|garrafas?|potes?|grandes?|pequenos?|\d+(kg|g|l|ml)?)$/;
/** Palavras que identificam o item: sem acento, sem "de", sem embalagem, no singular. */
function nameTokens(name) {
	return normalize(name.replace(/\(.*?\)/g, " ")).replace(/[^a-z0-9 ]/g, " ").split(" ").filter((w) => w && !STOP.has(w) && !PACK.test(w)).map((w) => ALIAS[w] ?? w).map((w) => w.length > 4 && w.endsWith("oes") ? w.slice(0, -3) + "ao" : w.length > 4 && w.endsWith("eis") ? w.slice(0, -3) + "el" : w.length > 3 && /[^s]s$/.test(w) ? w.slice(0, -1) : w);
}
/** Jeitos diferentes de escrever a mesma coisa. */
const ALIAS = {
	artesiano: "artesanal",
	nescal: "nescau",
	mucarela: "mussarela",
	mussarela: "mussarela",
	sobrecoxas: "sobrecoxa"
};
function findItemByName(d, name) {
	const q = nameTokens(name);
	if (!q.length) return void 0;
	let best;
	let bestScore = 0;
	for (const it of Object.values(d.items)) {
		if (it.deleted) continue;
		const t = nameTokens(it.name);
		if (!t.length) continue;
		const shared = t.filter((w) => q.includes(w)).length;
		if (shared === t.length || shared === q.length) {
			const score = shared * 10 - Math.abs(t.length - q.length);
			if (score > bestScore) {
				best = it;
				bestScore = score;
			}
		}
	}
	return best;
}
/** "Acabou!" — zera o estoque e já joga na lista. */
function markOut(itemId) {
	commit((d) => {
		const it = d.items[itemId];
		if (!it) return;
		Object.assign(touch(it), {
			stockQty: 0,
			stockAt: Date.now()
		});
		putInList(d, itemId, it.defaultQty, "acabou");
	});
}
function putInList(d, itemId, qty, reason, overwriteQty = false) {
	const existing = Object.values(d.list).find((e) => e.itemId === itemId && !e.deleted);
	if (existing) {
		if (overwriteQty) existing.qty = qty;
		return touch(existing);
	}
	const e = {
		id: uid(),
		itemId,
		qty,
		reason,
		addedBy: d.settings.me,
		updatedAt: Date.now()
	};
	d.list[e.id] = e;
	return e;
}
function addToList(itemId, qty, reason = "manual") {
	commit((d) => {
		const it = d.items[itemId];
		if (!it) return;
		putInList(d, itemId, qty ?? suggestBuyQty(d, it), reason);
	});
}
const UNIT_WORDS = [
	[/^(kg|quilos?|kilos?)$/i, "kg"],
	[/^(g|gramas?)$/i, "g"],
	[/^(l|litros?)$/i, "L"],
	[/^(pct|pcts|pacotes?)$/i, "pct"],
	[/^(cx|caixas?)$/i, "cx"],
	[/^(dz|d[uú]zias?)$/i, "dz"],
	[/^(latas?)$/i, "lata"],
	[/^(rolos?)$/i, "rolo"],
	[/^(bandejas?)$/i, "bandeja"],
	[/^(ma[cç]os?)$/i, "maço"],
	[/^(p[eé]s?)$/i, "pé"],
	[/^(cachos?)$/i, "cacho"],
	[/^(un|und|unid|unidades?|x)$/i, "un"]
];
function parseLine(raw) {
	let line = raw.replace(/^[\s\-•*·✓✔☐☑□▢>]+/, "").replace(/\[.?\]/, "").replace(/⚠.*$/, "").replace(/\s*[—–]\s*$/, "").trim();
	if (!line) return null;
	let qty;
	let unit;
	const lead = line.match(/^(\d+(?:[.,]\d+)?)\s*([a-zA-Zúçéã]+(?![a-zA-Zúçéã]))?\.?\s*(?:de\s+)?(.*)$/);
	if (lead) {
		const u = lead[2] && UNIT_WORDS.find(([re]) => re.test(lead[2]));
		if (u) {
			qty = parseFloat(lead[1].replace(",", "."));
			unit = u[1];
			line = lead[3].trim();
		} else {
			qty = parseFloat(lead[1].replace(",", "."));
			line = line.replace(/^\d+(?:[.,]\d+)?\s*/, "");
		}
	} else {
		const tail = line.match(/^(.*?)\s*[-–—:x]?\s*(\d+(?:[.,]\d+)?)\s*(x|un|kg|g|pcts?|l|cx|latas?|maços?|pés?|cachos?|bandejas?)?\b.*$/i);
		if (tail && tail[1]) {
			qty = parseFloat(tail[2].replace(",", "."));
			unit = tail[3] ? UNIT_WORDS.find(([re]) => re.test(tail[3]))?.[1] : void 0;
			line = tail[1].trim();
		}
	}
	if (!line || line.length < 2) return null;
	return {
		name: line,
		qty: qty && qty > 0 ? qty : void 0,
		unit
	};
}
function seedToItem(s, keys, now) {
	return {
		id: s.key,
		name: s.name,
		category: s.category,
		place: s.place,
		unit: s.unit,
		defaultQty: s.qty,
		everyMonths: s.every,
		note: s.note && s.origin === "lista" ? s.note : void 0,
		shopId: s.shop,
		pairs: (s.pairs ?? []).filter((p) => keys.has(p)),
		stockQty: null,
		stockAt: null,
		updatedAt: now
	};
}
/** Garante que um item do catálogo exista na despensa (pra pôr na lista a partir de uma receita). */
function ensureSeedItem(key) {
	const sd = SEED_ITEMS.find((x) => x.key === key);
	const cur = db.items[key];
	if (cur && !cur.deleted) return key;
	if (!sd) return null;
	commit((d) => {
		d.items[key] = seedToItem(sd, new Set(Object.keys(d.items)), Date.now());
	});
	return key;
}
function saveRecipe(r) {
	const id = r.id ?? uid();
	commit((d) => {
		const base = d.recipes[id] ?? {
			id,
			name: r.name,
			uses: [],
			meals: [],
			addedBy: d.settings.me,
			updatedAt: 0
		};
		d.recipes[id] = {
			...base,
			...r,
			id,
			updatedAt: Date.now()
		};
	});
	return id;
}
/** Acha na despensa os itens citados num texto de receita (um por linha ou separados por vírgula). */
function matchIngredients(text) {
	const ids = /* @__PURE__ */ new Set();
	for (const raw of text.split(/\r?\n|,|;|•/)) {
		const line = raw.replace(/\d+\s*(g|kg|ml|l|x[ií]caras?|colher(es)?( de sopa| de chá)?|pitadas?|dentes?)\b/gi, " ").trim();
		if (line.length < 3 || line.length > 80) continue;
		const p = parseLine(line);
		const it = p && findItemByName(db, p.name);
		if (it) ids.add(it.id);
	}
	return [...ids];
}
//#endregion
//#region src/data/voice.ts
const NUM = {
	um: 1,
	uma: 1,
	dois: 2,
	duas: 2,
	tres: 3,
	quatro: 4,
	cinco: 5,
	seis: 6,
	sete: 7,
	oito: 8,
	nove: 9,
	dez: 10,
	doze: 12,
	quinze: 15,
	vinte: 20
};
const OUT = /\b(acabou|acabaram|acabando|terminou|terminaram|nao tem mais|sem|faltando|falta|faltou)\b/;
const FILLER = /\b(feirinha|coloca|coloque|colocar|adiciona|adicione|adicionar|anota|anote|anotar|bota|bote|poe|ponha|por|comprar|compra|preciso de|precisa de|pra lista|na lista|a lista|lista|por favor|tambem|o|a|os|as|de novo|ai)\b/g;
/** Devolve as palavras como foram ditas (com acento): "cafe" → "café". */
function restoreAccents(original, plain) {
	const words = original.split(/\s+/);
	const target = plain.split(" ");
	for (let i = 0; i + target.length <= words.length; i++) {
		const slice = words.slice(i, i + target.length);
		if (slice.map((w) => normalize(w).replace(/[^a-z0-9]/g, "")).join(" ") === target.join(" ")) return slice.join(" ").replace(/[.,;!?]+$/, "");
	}
	return plain;
}
/** Item da despensa; se não tiver, do catálogo completo; se não, cria. */
function resolveItem(name, original) {
	const found = findItemByName(getDB(), name);
	if (found) return found;
	const q = nameTokens(name);
	const seed = SEED_ITEMS.find((s) => {
		const t = nameTokens(s.name);
		return t.length > 0 && (t.every((w) => q.includes(w)) || q.every((w) => t.includes(w)));
	});
	if (seed) {
		const id = ensureSeedItem(seed.key);
		if (id) return getDB().items[id];
	}
	const nice = restoreAccents(original, name);
	return addItem(nice.charAt(0).toUpperCase() + nice.slice(1));
}
function parseCommand(text) {
	let t = normalize(text);
	const intent = OUT.test(t) ? "acabou" : "lista";
	t = t.replace(OUT, " ");
	t = t.replace(/\bmeia duzia\b/g, "6 un").replace(/\bmeio quilo\b/g, "0.5 kg").replace(/\bum quilo e meio\b/g, "1.5 kg").replace(/\b(\w+) quilos?\b/g, (m, n) => NUM[n] ? `${NUM[n]} kg` : m).replace(/\b(um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|doze|quinze|vinte)\b/g, (n) => String(NUM[n]));
	t = t.replace(/(\d),(\d)/g, "$1.$2");
	const items = [];
	for (const raw of t.split(/,|;|\be\b|\bmais\b|\+/)) {
		const part = raw.replace(FILLER, " ").replace(/\s+/g, " ").trim();
		if (part.length < 2) continue;
		const p = parseLine(part);
		if (p) items.push({
			name: p.name,
			qty: p.qty
		});
	}
	return {
		intent,
		items,
		original: text
	};
}
/** Executa o comando. Devolve o resumo e como desfazer. */
function runCommand(cmd) {
	if (!cmd.items.length) return null;
	const names = [];
	const undo = undoable(() => {
		for (const { name, qty } of cmd.items) {
			const it = resolveItem(name, cmd.original ?? name);
			if (cmd.intent === "acabou") markOut(it.id);
			else addToList(it.id, qty, "manual");
			names.push(it.name);
		}
	});
	return {
		summary: `${cmd.intent === "acabou" ? "Acabou e foi pra lista" : "Na lista"}: ${names.join(", ")}`,
		undo
	};
}
//#endregion
//#region server/casa.ts
const KINDS = [
	"items",
	"shops",
	"list",
	"trips",
	"recipes"
];
const URL_ = process.env.VITE_SUPABASE_URL;
const KEY = process.env.VITE_SUPABASE_KEY;
async function rpc(fn, body) {
	const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, {
		method: "POST",
		headers: {
			apikey: KEY,
			Authorization: `Bearer ${KEY}`,
			"Content-Type": "application/json"
		},
		body: JSON.stringify(body)
	});
	if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
	return await r.json();
}
async function loadCasa(casa, me) {
	const db = {
		version: 1,
		items: {},
		shops: {},
		list: {},
		trips: {},
		recipes: {},
		settings: {
			me,
			people: [],
			ticketMonthly: 0,
			ticketDay: 5,
			onboarded: false
		}
	};
	let since = 0;
	for (;;) {
		const rows = await rpc("feirinha_pull", {
			p_casa: casa,
			p_since: since
		});
		for (const r of rows) if (r.kind === "settings") Object.assign(db.settings, r.data, {
			me,
			updatedAt: r.updated_at
		});
		else db[r.kind][r.id] = r.data;
		if (rows.length < 2e3) break;
		since = Math.max(...rows.map((r) => r.rev ?? 0));
	}
	return db;
}
/** Roda uma ação na casa e grava só os registros que mudaram. */
async function withCasa(casa, me, action) {
	const db = await loadCasa(casa, me);
	if (!db.settings.onboarded) throw new Error("Não achei essa casa. Confira o código do atalho nos Ajustes do Feirinha.");
	setDB(db);
	const changed = /* @__PURE__ */ new Set();
	const off = onCommit((prev, next) => {
		for (const k of KINDS) {
			const a = prev[k];
			const b = next[k];
			for (const id in b) if (!a[id] || a[id].updatedAt !== b[id].updatedAt) changed.add(`${k}:${id}`);
		}
		if ((prev.settings.updatedAt ?? 0) !== (next.settings.updatedAt ?? 0)) changed.add("settings:casa");
	});
	let reply;
	try {
		reply = action();
	} finally {
		off();
	}
	const now = getDB();
	const rows = [...changed].map((key) => {
		const [kind, id] = key.split(":");
		if (kind === "settings") return {
			kind,
			id,
			data: sharedSettings(now.settings),
			updated_at: now.settings.updatedAt ?? Date.now()
		};
		const rec = now[kind][id];
		return {
			kind,
			id,
			data: rec,
			updated_at: rec.updatedAt
		};
	});
	if (rows.length) await rpc("feirinha_push", {
		p_casa: casa,
		p_rows: rows
	});
	return reply;
}
async function handler(req, res) {
	res.setHeader("Content-Type", "text/plain; charset=utf-8");
	res.setHeader("Cache-Control", "no-store");
	const q = (k) => {
		const v = req.query[k];
		return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
	};
	const casa = q("c");
	const me = q("quem") || "Siri";
	if (casa.length < 20) return res.status(400).send("Falta o código da casa no atalho. Copie o link de novo nos Ajustes do Feirinha.");
	if (!URL_ || !KEY) return res.status(500).send("O servidor do Feirinha está sem configuração.");
	try {
		const voz = q("voz");
		if (voz) {
			const reply = await withCasa(casa, me, () => {
				const r = runCommand(parseCommand(voz));
				return r ? `${r.summary}.` : "Não entendi nenhum item. Tente de novo falando o nome do produto.";
			});
			return res.status(200).send(reply);
		}
		const link = q("receita");
		if (link) {
			const url = link.match(/https?:\/\/\S+/)?.[0] ?? link;
			let meta = {};
			try {
				meta = await fetchRecipeMeta(url);
			} catch {}
			const reply = await withCasa(casa, me, () => {
				const uses = meta.text ? matchIngredients(meta.text) : [];
				saveRecipe({
					name: meta.title || "Receita salva",
					url,
					text: meta.text || void 0,
					uses,
					meals: []
				});
				return uses.length ? `Receita salva no Feirinha: ${meta.title || "receita"}. Usa ${uses.length} ${uses.length === 1 ? "item" : "itens"} da despensa.` : `Receita salva no Feirinha${meta.title ? `: ${meta.title}` : ""}. Não consegui ler os ingredientes; dá pra colar a legenda no app.`;
			});
			return res.status(200).send(reply);
		}
		return res.status(400).send("Nada pra fazer: falta o texto (voz) ou o link da receita.");
	} catch (e) {
		return res.status(502).send(e instanceof Error && e.message.startsWith("Não achei") ? e.message : "Não consegui falar com a casa agora. Tente de novo em instantes.");
	}
}
//#endregion
export { handler as default };
