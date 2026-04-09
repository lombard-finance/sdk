export function unique<T>(arr: T[]): T[] {
  return arr.filter((v, i, a) => a.indexOf(v) === i);
}

export function orderBy<T>(
  arr: T[],
  property: (arrEntry: T) => string | number,
  direction: "asc" | "desc" = "asc",
): T[] {
  const array = [...arr];
  array.sort((a, b) => {
    const propA = property(a);
    const propB = property(b);

    if (typeof propA === "number") {
      return propA - (propB as number);
    }

    if (typeof propA === "string") {
      return propA.localeCompare(propB as string);
    }

    return 0;
  });

  if (direction === "desc") {
    array.reverse();
  }

  return array;
}
