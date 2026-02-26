import React from 'react';
// temporary fix - commented out due to build error
// import { usefronter } from "@/contexts/fronter-context";
// import { headmatecard } from "@/features/headmates/components/headmate-card";
// import { edgelesselement } from "../../store";
// import { useMemo } from "react";

export const ContactElement = React.memo(function ContactElement({ element: _element }: { element: any }) {
  return null;
}, (prev, next) => prev.element === next.element)
