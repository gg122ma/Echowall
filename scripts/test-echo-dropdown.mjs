import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let passed = 0;
let failed = 0;

function check(name, condition) {
  if (condition) {
    passed += 1;
    console.log(`PASS ${name}`);
  } else {
    failed += 1;
    console.error(`FAIL ${name}`);
  }
}

function dataKey(name) {
  return name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

class FakeClassList {
  constructor(owner) {
    this.owner = owner;
    this.values = new Set();
  }
  setFromString(value) { this.values = new Set(String(value || "").split(/\s+/).filter(Boolean)); }
  add(...values) { values.forEach(value => this.values.add(value)); }
  remove(...values) { values.forEach(value => this.values.delete(value)); }
  contains(value) { return this.values.has(value); }
  toggle(value, force) {
    const shouldAdd = force === undefined ? !this.values.has(value) : Boolean(force);
    if (shouldAdd) this.values.add(value); else this.values.delete(value);
    return shouldAdd;
  }
  toString() { return [...this.values].join(" "); }
}

class FakeEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.bubbles = Boolean(options.bubbles);
    this.defaultPrevented = false;
    this.target = options.target || null;
    this.currentTarget = null;
    this.key = options.key || "";
  }
  preventDefault() { this.defaultPrevented = true; }
}

class FakeElement {
  constructor(tagName, ownerDocument) {
    this.tagName = String(tagName).toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.parentElement = null;
    this.attributes = new Map();
    this.dataset = {};
    this.listeners = new Map();
    this.classList = new FakeClassList(this);
    this.style = {};
    this.textContent = "";
    this.id = "";
    this.type = "";
    this.disabled = false;
    this.tabIndex = 0;
    this._value = "";
    this._rect = { left: 20, top: 100, bottom: 142, width: 180, height: 42, right: 200 };
    this.focusCount = 0;
  }
  set className(value) { this.classList.setFromString(value); }
  get className() { return this.classList.toString(); }
  get options() { return this.tagName === "SELECT" ? this.children : undefined; }
  get selectedIndex() {
    if (this.tagName !== "SELECT") return -1;
    const index = this.children.findIndex(option => option.value === this._value);
    return index >= 0 ? index : (this.children.length ? 0 : -1);
  }
  set selectedIndex(index) {
    if (this.tagName === "SELECT" && this.children[index]) this._value = this.children[index].value;
  }
  get value() {
    if (this.tagName === "SELECT" && !this._value && this.children.length) return this.children[0].value;
    return this._value;
  }
  set value(value) { this._value = String(value); }
  get scrollHeight() { return this._scrollHeight ?? Math.max(40, this.children.length * 40 + 12); }
  get isConnected() {
    let node = this;
    while (node) {
      if (node === this.ownerDocument) return true;
      node = node.parentElement;
    }
    return false;
  }
  setAttribute(name, value) {
    const stringValue = String(value);
    this.attributes.set(name, stringValue);
    if (name === "id") this.id = stringValue;
    if (name === "class") this.className = stringValue;
    if (name.startsWith("data-")) this.dataset[dataKey(name)] = stringValue;
  }
  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
  removeAttribute(name) {
    this.attributes.delete(name);
    if (name.startsWith("data-")) delete this.dataset[dataKey(name)];
  }
  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }
  remove() {
    if (!this.parentElement?.children) return;
    this.parentElement.children = this.parentElement.children.filter(child => child !== this);
    this.parentElement = null;
  }
  contains(candidate) {
    if (candidate === this) return true;
    return this.children.some(child => child.contains(candidate));
  }
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }
  dispatchEvent(event) {
    if (!event.target) event.target = this;
    event.currentTarget = this;
    for (const listener of this.listeners.get(event.type) || []) listener(event);
    if (event.bubbles && this.parentElement?.dispatchEvent) this.parentElement.dispatchEvent(event);
    return !event.defaultPrevented;
  }
  focus() { this.ownerDocument.activeElement = this; this.focusCount += 1; }
  getBoundingClientRect() { return this._rect; }
  scrollIntoView() { this.scrolledIntoView = true; }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  querySelectorAll(selector) {
    const matches = [];
    const visit = element => {
      for (const child of element.children) {
        if (FakeElement.matches(child, selector)) matches.push(child);
        visit(child);
      }
    };
    visit(this);
    return matches;
  }
  static matches(element, selector) {
    if (selector === "select") return element.tagName === "SELECT";
    if (selector.startsWith(".")) return element.classList.contains(selector.slice(1));
    const dataMatch = selector.match(/^\[data-([a-z0-9-]+)\]$/);
    if (dataMatch) return Object.prototype.hasOwnProperty.call(element.dataset, dataKey(`data-${dataMatch[1]}`));
    return false;
  }
}

class FakeDocument {
  constructor() {
    this.listeners = new Map();
    this.activeElement = null;
    this.body = new FakeElement("body", this);
    this.body.parentElement = this;
  }
  createElement(tagName) { return new FakeElement(tagName, this); }
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }
  dispatchEvent(event) {
    if (!event.target) event.target = this;
    event.currentTarget = this;
    for (const listener of this.listeners.get(event.type) || []) listener(event);
    return !event.defaultPrevented;
  }
  querySelector(selector) { return this.body.querySelector(selector); }
  querySelectorAll(selector) { return this.body.querySelectorAll(selector); }
  getElementById(id) {
    const visit = element => {
      if (element.id === id) return element;
      for (const child of element.children) {
        const found = visit(child);
        if (found) return found;
      }
      return null;
    };
    return visit(this.body);
  }
}

function createEnvironment() {
  const document = new FakeDocument();
  const windowListeners = new Map();
  const window = {
    document,
    innerWidth: 390,
    innerHeight: 844,
    requestAnimationFrame: callback => callback(),
    addEventListener(type, listener) {
      if (!windowListeners.has(type)) windowListeners.set(type, []);
      windowListeners.get(type).push(listener);
    },
    dispatch(type) {
      for (const listener of windowListeners.get(type) || []) listener(new FakeEvent(type));
    },
  };
  window.window = window;
  const context = vm.createContext({ window, document, Event: FakeEvent, console });
  const source = fs.readFileSync(path.join(ROOT, "services", "echo-dropdown.js"), "utf8");
  vm.runInContext(source, context, { filename: "services/echo-dropdown.js" });
  return { window, document, api: window.EchoDropdown };
}

function makeSelect(document, root, id, entries, currentValue, rect) {
  const field = document.createElement("div");
  const label = document.createElement("span");
  const wrapper = document.createElement("div");
  const select = document.createElement("select");
  label.id = `${id}-label`;
  label.textContent = id;
  wrapper.setAttribute("data-echo-select", "");
  wrapper.setAttribute("data-echo-select-labelledby", label.id);
  select.id = id;
  select.setAttribute("aria-labelledby", label.id);
  for (const entry of entries) {
    const option = document.createElement("option");
    option.value = entry.value;
    option.textContent = entry.label;
    option.disabled = Boolean(entry.disabled);
    select.appendChild(option);
  }
  select.value = currentValue;
  field.appendChild(label);
  wrapper.appendChild(select);
  field.appendChild(wrapper);
  root.appendChild(field);
  if (rect) wrapper._rect = rect;
  return { wrapper, select };
}

const environment = createEnvironment();
const { window, document, api } = environment;
const root = document.createElement("section");
document.body.appendChild(root);
const values = [
  { value: "", label: "All" },
  { value: "2024/2025", label: "2024/2025" },
  { value: "2012/2025", label: "2012–2025" },
];
const first = makeSelect(document, root, "study-year", values, "2024/2025");
const second = makeSelect(document, root, "study-sort", [
  { value: "relevant", label: "Relevant" },
  { value: "newest", label: "Newest" },
], "relevant");
let firstChanges = 0;
first.select.addEventListener("change", () => { firstChanges += 1; });

check("enhances every requested select", api.enhance(root) === 2);
const firstTrigger = first.wrapper.querySelector(".echo-select-trigger");
const secondTrigger = second.wrapper.querySelector(".echo-select-trigger");
check("native source is visually hidden only after enhancement", first.wrapper.classList.contains("is-enhanced") && first.select.getAttribute("aria-hidden") === "true");
check("trigger exposes combobox/listbox semantics", firstTrigger.getAttribute("role") === "combobox" && firstTrigger.getAttribute("aria-controls") === "study-year-listbox");
check("current native value is displayed", firstTrigger.querySelector(".echo-select-value").textContent === "2024/2025");

firstTrigger.dispatchEvent(new FakeEvent("click"));
let menu = document.querySelector(".echo-select-menu");
check("open menu has the exact native option count", menu.children.length === first.select.options.length);
check("selected option state is exposed", menu.children[1].getAttribute("aria-selected") === "true");
menu.children[2].dispatchEvent(new FakeEvent("click", { bubbles: true }));
check("custom selection updates the native source value", first.select.value === "2012/2025");
check("custom selection emits change exactly once", firstChanges === 1);
check("custom selection displays mapped label", firstTrigger.querySelector(".echo-select-value").textContent === "2012–2025");

firstTrigger.dispatchEvent(new FakeEvent("click"));
menu = document.querySelector(".echo-select-menu");
menu.children[2].dispatchEvent(new FakeEvent("click", { bubbles: true }));
check("reselecting the current value does not emit a duplicate change", firstChanges === 1);

first.select.value = "2024/2025";
first.select.dispatchEvent(new FakeEvent("change"));
check("native-to-custom synchronization updates the trigger", firstTrigger.querySelector(".echo-select-value").textContent === "2024/2025");

firstTrigger.dispatchEvent(new FakeEvent("click"));
secondTrigger.dispatchEvent(new FakeEvent("click"));
check("opening another control closes the previous menu", document.querySelectorAll(".echo-select-menu").length === 1 && firstTrigger.getAttribute("aria-expanded") === "false" && secondTrigger.getAttribute("aria-expanded") === "true");

const outside = document.createElement("div");
document.body.appendChild(outside);
document.dispatchEvent(new FakeEvent("pointerdown", { target: outside }));
check("outside pointer closes the menu", document.querySelectorAll(".echo-select-menu").length === 0 && secondTrigger.getAttribute("aria-expanded") === "false");

firstTrigger.dispatchEvent(new FakeEvent("keydown", { key: "Enter" }));
const escapeEvent = new FakeEvent("keydown", { key: "Escape" });
firstTrigger.dispatchEvent(escapeEvent);
check("Escape closes and restores trigger focus", !document.querySelector(".echo-select-menu") && document.activeElement === firstTrigger && escapeEvent.defaultPrevented);

first.select.value = "";
first.select.dispatchEvent(new FakeEvent("change"));
firstChanges = 0;
firstTrigger.dispatchEvent(new FakeEvent("keydown", { key: "Enter" }));
firstTrigger.dispatchEvent(new FakeEvent("keydown", { key: "ArrowDown" }));
firstTrigger.dispatchEvent(new FakeEvent("keydown", { key: "Enter" }));
check("keyboard navigation selects the active option", first.select.value === "2024/2025" && firstChanges === 1);

firstTrigger.dispatchEvent(new FakeEvent("keydown", { key: "Enter" }));
firstTrigger.dispatchEvent(new FakeEvent("keydown", { key: "End" }));
firstTrigger.dispatchEvent(new FakeEvent("keydown", { key: "Enter" }));
check("End moves to the final option", first.select.value === "2012/2025");

firstTrigger.dispatchEvent(new FakeEvent("keydown", { key: "Enter" }));
const tabEvent = new FakeEvent("keydown", { key: "Tab" });
firstTrigger.dispatchEvent(tabEvent);
check("Tab closes without trapping focus", !document.querySelector(".echo-select-menu") && !tabEvent.defaultPrevented);

api.enhance(root);
firstChanges = 0;
first.select.value = "";
first.select.dispatchEvent(new FakeEvent("change"));
firstChanges = 0;
firstTrigger.dispatchEvent(new FakeEvent("click"));
document.querySelector(".echo-select-menu").children[1].dispatchEvent(new FakeEvent("click", { bubbles: true }));
check("repeat enhancement does not duplicate listeners or filtering events", firstChanges === 1);

firstTrigger.dispatchEvent(new FakeEvent("click"));
check("relevant rerender/enhance closes an open portal", Boolean(document.querySelector(".echo-select-menu")));
api.enhance(root);
check("rerender cleanup removes the open portal", !document.querySelector(".echo-select-menu"));

firstTrigger.dispatchEvent(new FakeEvent("click"));
window.dispatch("hashchange");
check("route hash change closes the open portal", !document.querySelector(".echo-select-menu"));

const longRoot = document.createElement("section");
document.body.appendChild(longRoot);
const longEntries = Array.from({ length: 30 }, (_, index) => ({ value: String(index), label: `Year ${index}` }));
const longSelect = makeSelect(document, longRoot, "long-years", longEntries, "15");
api.enhance(longRoot);
const longTrigger = longSelect.wrapper.querySelector(".echo-select-trigger");
longTrigger.dispatchEvent(new FakeEvent("click"));
menu = document.querySelector(".echo-select-menu");
check("long menu receives a bounded internal-scroll height", Number.parseFloat(menu.style.maxHeight) <= 280 && Number.parseFloat(menu.style.maxHeight) < menu.scrollHeight);
check("current long-list selection is scrolled into view", menu.children[15].scrolledIntoView === true);

const mobileLayout = api.computeMenuLayout({ left: 330, top: 120, bottom: 162, width: 180 }, { width: 390, height: 844 }, 900, 140);
check("mobile layout stays inside the horizontal viewport", mobileLayout.left >= 8 && mobileLayout.left + mobileLayout.width <= 382);
check("mobile layout applies a sensible max-height", mobileLayout.maxHeight > 0 && mobileLayout.maxHeight <= 280);
const flippedLayout = api.computeMenuLayout({ left: 20, top: 760, bottom: 802, width: 180 }, { width: 390, height: 844 }, 260, 140);
check("popup flips above when space below is insufficient", flippedLayout.opensAbove && flippedLayout.top < 760);

const css = fs.readFileSync(path.join(ROOT, "style-study.css"), "utf8");
check("menu CSS uses fixed portal positioning and internal scrolling", /\.echo-select-menu\s*\{[^}]*position:\s*fixed[^}]*overflow-y:\s*auto[^}]*overscroll-behavior:\s*contain/s.test(css));
check("mobile options have comfortable touch targets", /@media \(max-width: 720px\)[\s\S]*\.echo-select-option\s*\{\s*min-height:\s*44px/.test(css));

const appStudySource = fs.readFileSync(path.join(ROOT, "app-study.js"), "utf8");
const displayStart = appStudySource.indexOf("function studyYearLabel");
const displayEnd = appStudySource.indexOf("// --- STUDY-V2-004", displayStart);
const displayContext = vm.createContext({ I18n: { t: key => key } });
vm.runInContext(appStudySource.slice(displayStart, displayEnd), displayContext);
check("multi-year range display uses an en dash", displayContext.studyYearLabel({ yearStart: 2012, yearEnd: 2025, examSessionLabel: "2012/2025" }) === "2012–2025");
check("ordinary academic session display keeps its slash", displayContext.studyYearLabel({ yearStart: 2024, yearEnd: 2025, examSessionLabel: "2024/2025" }) === "2024/2025");

const subjectStart = appStudySource.indexOf("function studySubjectFilterScope");
const subjectEnd = appStudySource.indexOf("function studyRenderSubjectFiltersAndList", subjectStart);
const searchStart = appStudySource.indexOf("function studySearchFilterBarHtml");
const searchEnd = appStudySource.indexOf("// Search + Filter compose", searchStart);
const renderContext = vm.createContext({
  escapeHtml: value => String(value),
  I18n: { t: key => key },
  StudyResourceService: {
    getResourceCategory: () => "pspm",
    getFilterOptions: () => ({ years: ["2012/2025"], subtypes: ["pspm"], sourceColleges: ["KMK"] }),
  },
});
vm.runInContext(appStudySource.slice(displayStart, displayEnd), renderContext);
vm.runInContext(appStudySource.slice(subjectStart, subjectEnd), renderContext);
vm.runInContext(appStudySource.slice(searchStart, searchEnd), renderContext);
const resource = { yearStart: 2012, yearEnd: 2025, examSessionLabel: "2012/2025", resourceSubtype: "pspm", sourceCollege: "KMK" };
const subjectHtml = renderContext.studySubjectFilterBarHtml({ resources: [resource], category: "all", filters: { year: "2012/2025", subtype: "", sourceCollege: "" }, sort: "relevant" });
const searchHtml = renderContext.studySearchFilterBarHtml({ rankedResults: [resource], year: "2012/2025", sourceCollege: "", sort: "relevant" });
check("all four subject filters render custom-select hosts", (subjectHtml.match(/data-echo-select(?=[\s>])/g) || []).length === 4 && (subjectHtml.match(/<select/g) || []).length === 4);
check("Study search/result filters also render custom-select hosts", (searchHtml.match(/data-echo-select(?=[\s>])/g) || []).length === 3 && (searchHtml.match(/<select/g) || []).length === 3);
check("range option keeps canonical value while mapping visible label", subjectHtml.includes('value="2012/2025"') && subjectHtml.includes(">2012–2025</option>"));

const manifestContext = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync(path.join(ROOT, "data", "study-resource-manifest.js"), "utf8"), manifestContext);
const rangeRecord = manifestContext.window.STUDY_RESOURCE_MANIFEST.find(item => item.id === "study_7afa5acbfbf9ff7759be");
check("2012/2025 source record is not silently rewritten", rangeRecord?.title === "Past Year SM015 2012-2025 (Question)" && rangeRecord.yearStart === 2012 && rangeRecord.yearEnd === 2025 && rangeRecord.examSessionLabel === "2012/2025");

console.log(`\nEchoDropdown tests: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
