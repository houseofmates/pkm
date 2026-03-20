import { useState } from 'react';

export default function Template() {
  const [tpl] = useState(`{
    "meta": { "name": "sample template", "icon": "Layout" },
    "layout": { "columns": [[], []] }
  }`);
  return null;
}
