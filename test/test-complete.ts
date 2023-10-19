import {EditorState} from "@codemirror/state"
import {CompletionContext, CompletionResult, CompletionSource} from "@codemirror/autocomplete"
import ist from "ist"
import { html } from "@codemirror/lang-html";

function get(doc: string, conf: {explicit?: boolean, config?: any} = {}) {
  let cur = doc.indexOf("|")
  doc = doc.slice(0, cur) + doc.slice(cur + 1)
  let state = EditorState.create({
    doc,
    selection: {anchor: cur},
    extensions: [html(conf.config || {})]
  })
  let result = state.languageDataAt<CompletionSource>("autocomplete", cur)[0](new CompletionContext(state, cur, !!conf.explicit))
  return result as CompletionResult | null
}

describe("HTML completion", () => {
  it("completes tag names", () => {
    let c = get("<|")!.options
    ist(c.length, 100, ">")
    ist(!c.some(o => /\W/.test(o.label)))
  })

  it("doesn't complete from nothing unless explicit", () => {
    ist(!get("|"))
  })

  it("completes at top level", () => {
    let c = get("|", {explicit: true})!.options
    ist(c.length, 100, ">")
    ist(c.every(o => /^<\w+$/.test(o.label) && o.type == "type"))
  })

  it("completes inside an element", () => {
    let c = get("<body>|", {explicit: true})!.options
    ist(c.length, 100, ">")
    ist(c.some(o => o.label == "</body>"))
    ist(c.every(o => /^<(\/body>|\w+)$/.test(o.label)))
  })

  it("completes attribute names", () => {
    let c = get("<body f|")!.options
    ist(c.length)
    ist(c.every(o => o.type == "property"))
  })

  it("completes attribute names explicitly", () => {
    let c = get("<body |", {explicit: true})!.options
    ist(c.length)
    ist(c.every(o => o.type == "property"))
  })

  it("completes attribute values", () => {
    let c = get("<form method=|")!.options
    ist(c.map(o => o.label).sort().join(","), "delete,get,post,put")
  })

  it("completes the 2nd attribute's values", () => {
    let c = get("<form lang=en method=|")!.options
    ist(c.map(o => o.label).sort().join(","), "delete,get,post,put")
  })

  it("keeps quotes for attribute values", () => {
    let c = get('<form method="|')!.options
    ist(c.map(o => o.apply).sort().join(","), 'delete",get",post",put"')
  })

  it("omits already closed quotes", () => {
    let c = get('<form method="|"')!
    ist(c.to, 14)
    ist(c.options.map(o => o.apply).sort().join(","), "delete,get,post,put")
  })

  it("can handle single quotes", () => {
    let c = get("<form method='|'")!
    ist(c.to, 14)
    ist(c.options.map(o => o.apply).sort().join(","), "delete,get,post,put")
  })

  it("completes close tags", () => {
    let c = get("<body></|")!.options
    ist(c.length, 1)
    ist(c[0].apply, "body>")
  })

  it("completes partial close tags", () => {
    let c = get("<body></b|")!.options
    ist(c.length, 1)
    ist(c[0].apply, "body>")
  })

  it("only completes close tags that haven't already been closed", () => {
    let c = get("<html><body><div><p></|</body></html>")!.options
    ist(c.length, 2)
    ist(c.map(o => o.apply).join(","), "p>,div>")
  })

  it("includes close tag in completion after less-than", () => {
    let c = get("<html><|")!.options
    ist(c.some(o => o.apply == "/html>"))
  })

  it("completes allowed children", () => {
    let c = get("<head>|</head>", {explicit: true})!.options
    ist(!c.some(o => /\<div/.test(o.label)))
  })

  it("completes allowed children after unfinished opening tag", () => {
    let c = get("<head><|</head>")!.options
    ist(!c.some(o => /^div/.test(o.label)))
  })
})
