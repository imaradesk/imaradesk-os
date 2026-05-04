import React, { useState } from "react";
import { Editor } from "react-draft-wysiwyg";
import { EditorState, convertToRaw, ContentState } from "draft-js";
import draftToHtml from "draftjs-to-html";
import htmlToDraft from "html-to-draftjs";
import api from "../../utils/axios";

import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";

const RichEditor = ({ value, onChange, placeholder }) => {
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

  const handleChange = (state) => {
    setEditorState(state);

    const html = draftToHtml(convertToRaw(state.getCurrentContent()));
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
    <div className="border rounded p-2 bg-white">
      <Editor
        editorState={editorState}
        onEditorStateChange={handleChange}
        placeholder={placeholder || "Write here..."}
        toolbar={{
          options: ["inline", "blockType", "list", "textAlign", "link", "image", "history"],
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