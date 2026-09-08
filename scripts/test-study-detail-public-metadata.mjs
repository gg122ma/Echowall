#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = file => fs.readFileSync(path.join(ROOT, file), "utf8");
let passed = 0;
function check(name, condition) {
  assert.ok(condition, name);
  passed += 1;
  console.log(`PASS - ${name}`);
}

const studySource = read("app-study.js");
const detailStart = studySource.indexOf("function renderStudyResourceDetail");
const detailEnd = studySource.indexOf("// --- STUDY-V2-007: Upload Study Material", detailStart);
assert.ok(detailStart >= 0 && detailEnd > detailStart, "Study detail renderer is present");
const detailRenderer = studySource.slice(detailStart, detailEnd);

check("public Study detail does not render the Source metadata label", !detailRenderer.includes('I18n.t("study.detail.source")'));
check("public Study detail does not render a Source value or fallback", !/studySourceLabel|sourceUnspecified|Source not specified/.test(detailRenderer));
check("public Study detail does not render the Verification metadata label", !detailRenderer.includes('I18n.t("study.detail.verification")'));
check("public Study detail does not render a Verification badge or fallback", !/verificationBadge|studyVerificationBadgeHtml|study\.unverified|Unverified/.test(detailRenderer));
check("remaining detail metadata retains Subject, Semester, Type, and Year", ["subject", "semester", "type", "year"].every(key => detailRenderer.includes(`I18n.t("study.detail.${key}")`)));
check("detail grid closes immediately after the four retained metadata cells", /study\.detail\.year[\s\S]*?<\/div>\s*<\/dl>/.test(detailRenderer));
check("Question and Answer Scheme relationship rendering remains present", /study\.relatedQuestion/.test(detailRenderer) && /study\.relatedScheme/.test(detailRenderer));
check("PDF and file opening behavior remains present", /study\.openPdf/.test(detailRenderer) && /study-file-open/.test(detailRenderer));
check("underlying source and verification fields remain available internally", /resource\.sourceCollege/.test(studySource) && /resource\.verificationStatus/.test(studySource));

const resource = {
  id: "resource-1", jurusan: "science", semester: 2, subjectCode: "SC025",
  title: "Practice Question", resourceType: "question", yearStart: 2026,
  sourceCollege: null, verificationStatus: "unverified", description: "Revision material",
};
const related = { ...resource, id: "resource-2", title: "Answer Scheme", resourceType: "answer_scheme" };
const labels = {
  "study.hub.title": "Echo Library", "study.semesterLabel": "Semester",
  "study.detail.subject": "Subject", "study.detail.semester": "Semester",
  "study.detail.type": "Type", "study.detail.year": "Year",
  "study.relatedQuestion": "Question PDF", "study.relatedScheme": "Answer Scheme PDF",
  "study.openPdf": "Open PDF", "study.openFile": "Open file",
  "study.fileType.pdf": "PDF", "study.fileUnavailableInDemo": "Unavailable",
  "study.fileUnavailableInDemoNote": "Unavailable note",
};
const renderContext = {
  StudyResourceService: {
    getResourceById: () => resource,
    isResourcePublishable: () => true,
    getJurusanById: () => ({ name: "Science" }),
    getSubjectByCode: () => ({ code: "SC025", name: "Computer Science" }),
    getResourceCategory: item => item.resourceType,
    getRelatedResource: () => related,
    getResourceFileUrl: () => "assets/study-files/resource-1.pdf",
    getResourceFileType: () => "pdf",
    isResourceFilePdf: () => true,
  },
  I18n: { t: key => labels[key] || key },
  escapeHtml: value => String(value),
  studyJurusanDisplayName: item => item.name,
  studySubjectDisplayName: item => item.name,
  studyResourceCategoryLabel: value => value === "question" ? "Question PDF" : "Answer Scheme PDF",
  studyYearLabel: () => "2026",
  studyBreadcrumb: parts => parts.join(" / "),
  studyIsIndexedDbFileUrl: () => false,
  renderStudyNotFound: () => { throw new Error("fixture unexpectedly rendered not-found"); },
};
vm.createContext(renderContext);
vm.runInContext(detailRenderer, renderContext);
const container = { innerHTML: "" };
renderContext.renderStudyResourceDetail(container, resource.id);
const rendered = container.innerHTML;
check("rendered production-facing detail has no Source wording or placeholder", !/>\s*Source\s*</.test(rendered) && !/Source not specified|Unknown/.test(rendered));
check("rendered production-facing detail has no Verification wording or placeholder", !/>\s*Verification\s*</.test(rendered) && !/Unverified/.test(rendered));
check("rendered detail contains exactly four metadata cells with no empty gap cell", (rendered.match(/<dt>/g) || []).length === 4 && (rendered.match(/<dd>/g) || []).length === 4);
check("rendered detail retains Question and Answer Scheme navigation plus PDF action", /Question PDF/.test(rendered) && /Answer Scheme/.test(rendered) && /Open PDF/.test(rendered));

console.log(`\n${passed}/${passed} assertions passed.`);
