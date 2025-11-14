"use client";

import { GridList, GridListItem } from "@/components/ui/forms/grid-list";

export function GridListDemo() {
  return (
    <GridList aria-label="Favorite pokemon" selectionMode="multiple">
      <GridListItem id="charizard">Charizard</GridListItem>
      <GridListItem id="blastoise">Blastoise</GridListItem>
      <GridListItem id="venusaur">Venusaur</GridListItem>
      <GridListItem id="pikachu">Pikachu</GridListItem>
    </GridList>
  );
}

