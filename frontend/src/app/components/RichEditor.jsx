import React, { useEffect, useRef, useState } from "react";
import { Editor } from "react-draft-wysiwyg";
import { EditorState, convertToRaw, ContentState } from "draft-js";
import draftToHtml from "draftjs-to-html";
import htmlToDraft from "html-to-draftjs";
import api from "../../utils/axios";

import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";

export const isRichTextEmpty = (html) =>
  !html || !html.replace(/<img[^>]*>/gi, "x").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();

const DEFAULT_OPTIONS = ["inline", "blockType", "list", "textAlign", "link", "image", "history"];
const COMPACT_OPTIONS = ["inline", "list", "link", "image", "history"];

const RichEditor = ({
  value,
  onChange,
  placeholder,
  compact = false,
  mentions = false,
  onMentionsChange,
  internal = false,
  editorRef,
  onFocus,
  onBlur,
}) => {
  const createEditorState = (html) => {
    if (!html) return EditorState.createEmpty();
    const contentBlock = htmlToDraft(html);
    const contentState = ContentState.createFromBlockArray(
      contentBlock.contentBlocks
    );
    return EditorState.createWithContent(contentState);
  };

  const [editorState, setEditorState] = useState(
    createEditorState(value)
  );
  const [mentionUsers, setMentionUsers] = useState([]);
  const lastMentionKey = useRef("");

  // Allow parents to clear the editor (e.g. after submitting a reply)
  useEffect(() => {
    if (isRichTextEmpty(value) && editorState.getCurrentContent().hasText()) {
      setEditorState(EditorState.createEmpty());
    }
  }, [value]);

  useEffect(() => {
    if (!mentions) return;
    api.get("/tickets/mentions/search/?limit=50")
      .then((res) => setMentionUsers(res.data.users || []))
      .catch(() => setMentionUsers([]));
  }, [mentions]);

  const emitMentions = (raw) => {
    if (!onMentionsChange) return;
    const ids = [];
    Object.values(raw.entityMap || {}).forEach((entity) => {
      if (entity.type !== "MENTION") return;
      const id = Number(String(entity.data?.url || "").replace("#user-", ""));
      if (id && !ids.includes(id)) ids.push(id);
    });
    const key = ids.join(",");
    if (key !== lastMentionKey.current) {
      lastMentionKey.current = key;
      onMentionsChange(ids);
    }
  };

  const handleChange = (state) => {
    setEditorState(state);

    const raw = convertToRaw(state.getCurrentContent());
    emitMentions(raw);
    const html = state.getCurrentContent().hasText() || raw.entityMap && Object.keys(raw.entityMap).length
      ? draftToHtml(raw)
      : "";
    onChange(html); // send HTML back like textarea value
  };

  const uploadImageCallback = (file) => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'editor-images');

      api.post('/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
        .then((response) => {
          resolve({ data: { link: response.data.file_url } });
        })
        .catch((error) => {
          reject(error);
        });
    });
  };

  return (
    <div className={`rich-editor${compact ? " rich-editor--compact" : ""}${internal ? " rich-editor--internal" : ""}`}>
      <Editor
        editorRef={editorRef}
        editorState={editorState}
        onEditorStateChange={handleChange}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder || "Write here..."}
        wrapperClassName="rich-editor__wrapper"
        toolbarClassName="rich-editor__toolbar"
        editorClassName="rich-editor__content"
        mention={mentions ? {
          separator: " ",
          trigger: "@",
          suggestions: mentionUsers.map((u) => ({
            text: u.name || u.username,
            value: u.name || u.username,
            url: `#user-${u.id}`,
          })),
        } : undefined}
        toolbar={{
          options: compact ? COMPACT_OPTIONS : DEFAULT_OPTIONS,
          ...(compact && {
            inline: { options: ["bold", "italic", "underline", "strikethrough", "monospace"] },
            list: { options: ["unordered", "ordered"] },
          }),
          image: {
            uploadCallback: uploadImageCallback,
            alt: { present: true, mandatory: false },
            previewImage: true,
            inputAccept: 'image/gif,image/jpeg,image/jpg,image/png,image/svg',
          },
        }}
      />
    </div>
  );
};

export default RichEditor;
