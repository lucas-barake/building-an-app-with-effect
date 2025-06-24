import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";
import { validateWithSchema, type Paths } from "./make-form-options";

const SimpleSchema = Schema.Struct({
  name: Schema.String,
  age: Schema.Number,
});

const NestedSchema = Schema.Struct({
  user: Schema.Struct({
    id: Schema.Number,
    name: Schema.String,
    address: Schema.optional(
      Schema.Struct({
        street: Schema.String,
        city: Schema.String,
      }),
    ),
  }),
  timestamp: Schema.DateFromSelf,
});

const ArraySchema = Schema.Struct({
  tags: Schema.Array(Schema.String),
  scores: Schema.Array(
    Schema.Struct({
      value: Schema.Number,
      label: Schema.optional(Schema.String),
    }),
  ),
});

const ConstraintsSchema = Schema.Struct({
  email: Schema.String.pipe(
    Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, { message: () => "Invalid email format" }),
  ),
  count: Schema.Number.pipe(Schema.positive()),
  description: Schema.optional(Schema.String.pipe(Schema.minLength(10))),
});

const DeepSchema = Schema.Struct({
  a: Schema.Struct({
    b: Schema.Struct({
      c: Schema.Struct({
        d: Schema.String,
      }),
      e: Schema.optional(Schema.Number),
    }),
  }),
});

describe("validateWithSchema", () => {
  describe("Simple Schema", () => {
    const validateSimple = validateWithSchema(SimpleSchema);

    it("should return null for valid data", () => {
      const submission = { value: { name: "Alice", age: 30 } };
      expect(validateSimple(submission)).toBeNull();
    });

    it("should return errors for invalid types", () => {
      const submission = { value: { name: "Bob", age: "thirty" } };
      const expectedErrors: Partial<
        Record<Paths<Schema.Schema.Encoded<typeof SimpleSchema>>, string>
      > = {
        age: 'Expected number, actual "thirty"',
      };

      // @ts-expect-error
      expect(validateSimple(submission)).toEqual(expectedErrors);
    });

    it("should return errors for missing required fields", () => {
      const submission = { value: { name: "Charlie" } }; // age is missing
      const expectedErrors: Partial<
        Record<Paths<Schema.Schema.Encoded<typeof SimpleSchema>>, string>
      > = {
        age: "is missing",
      };

      // @ts-expect-error - age is missing
      expect(validateSimple(submission)).toEqual(expectedErrors);
    });

    it("should return multiple errors if present", () => {
      const submission = { value: { name: 123, age: "thirty" } }; // name and age have wrong types
      const expectedErrors: Partial<
        Record<Paths<Schema.Schema.Encoded<typeof SimpleSchema>>, string>
      > = {
        name: "Expected string, actual 123",
        age: 'Expected number, actual "thirty"',
      };

      // @ts-expect-error - name and age have wrong types
      expect(validateSimple(submission)).toEqual(expectedErrors);
    });

    it("should ignore excess properties and return null if the rest is valid", () => {
      const submission = { value: { name: "David", age: 40, extra: "field" } };
      expect(validateSimple(submission)).toBeNull();
    });

    it("should return errors even if excess properties are present", () => {
      const submission = { value: { name: "Eve", age: "invalid", extra: "field" } };
      const expectedErrors: Partial<
        Record<Paths<Schema.Schema.Encoded<typeof SimpleSchema>>, string>
      > = {
        age: 'Expected number, actual "invalid"',
      };
      // @ts-expect-error
      expect(validateSimple(submission)).toEqual(expectedErrors);
    });

    it("should handle empty object input", () => {
      const submission = { value: {} };
      const expectedErrors: Partial<
        Record<Paths<Schema.Schema.Encoded<typeof SimpleSchema>>, string>
      > = {
        name: "is missing",
        age: "is missing",
      };
      // @ts-expect-error
      expect(validateSimple(submission)).toEqual(expectedErrors);
    });
  });

  // --- Nested Schema Tests ---
  describe("Nested Schema", () => {
    const validateNested = validateWithSchema(NestedSchema);

    it("should return null for valid nested data", () => {
      const submission = {
        value: {
          user: { id: 1, name: "Alice", address: { street: "123 Main St", city: "Anytown" } },
          timestamp: new Date(),
        },
      };
      expect(validateNested(submission)).toBeNull();
    });

    it("should return null when optional nested object is missing", () => {
      const submission = {
        value: {
          // address is missing, which is allowed by Schema.optional
          user: { id: 1, name: "Alice" },
          timestamp: new Date(),
        },
      };
      expect(validateNested(submission)).toBeNull();
    });

    it("should return errors for invalid data in nested objects", () => {
      const submission = {
        value: {
          user: { id: "abc", name: "Bob", address: { street: 123, city: "Othertown" } },
          timestamp: "not-a-date",
        },
      };
      const expectedErrors: Partial<
        Record<Paths<Schema.Schema.Encoded<typeof NestedSchema>>, string>
      > = {
        "user.id": 'Expected number, actual "abc"',
        "user.address.street": "Expected string, actual 123",
        timestamp: 'Expected DateFromSelf, actual "not-a-date"',
        "user.address": 'Expected undefined, actual {"street":123,"city":"Othertown"}',
      };
      // @ts-expect-error
      expect(validateNested(submission)).toEqual(expectedErrors);
    });

    it("should return errors for missing fields in nested objects", () => {
      const submission = {
        value: {
          user: { id: 2 }, // name is missing
          timestamp: new Date(),
        },
      };
      const expectedErrors: Partial<
        Record<Paths<Schema.Schema.Encoded<typeof NestedSchema>>, string>
      > = {
        "user.name": "is missing",
      };
      // @ts-expect-error
      expect(validateNested(submission)).toEqual(expectedErrors);
    });

    it("should return errors for invalid data in an optional nested object when present", () => {
      const submission = {
        value: {
          user: { id: 1, name: "Alice", address: { street: 123, city: "Anytown" } }, // invalid street
          timestamp: new Date(),
        },
      };
      const expectedErrors: Partial<
        Record<Paths<Schema.Schema.Encoded<typeof NestedSchema>>, string>
      > = {
        "user.address.street": "Expected string, actual 123",
        "user.address": 'Expected undefined, actual {"street":123,"city":"Anytown"}',
      };
      // @ts-expect-error - invalid street type in optional address
      expect(validateNested(submission)).toEqual(expectedErrors);
    });
  });

  // --- Array Schema Tests ---
  describe("Array Schema", () => {
    const validateArray = validateWithSchema(ArraySchema);

    it("should return null for valid array data", () => {
      const submission = {
        value: {
          tags: ["dev", "test"],
          scores: [{ value: 100, label: "Math" }, { value: 95 }],
        },
      };
      expect(validateArray(submission)).toBeNull();
    });

    it("should return null for empty arrays if allowed", () => {
      const submission = {
        value: {
          tags: [],
          scores: [],
        },
      };
      expect(validateArray(submission)).toBeNull();
    });

    it("should return errors for invalid types within array elements", () => {
      const submission = {
        value: {
          tags: ["dev", 123, "prod"],
          scores: [{ value: 100 }, { value: "high", label: "Science" }],
        },
      };
      const expectedErrors: Partial<
        Record<Paths<Schema.Schema.Encoded<typeof ArraySchema>>, string>
      > = {
        "tags.1": "Expected string, actual 123",
        "scores.1.value": 'Expected number, actual "high"',
      };
      // @ts-expect-error
      expect(validateArray(submission)).toEqual(expectedErrors);
    });

    it("should return errors for invalid optional types within array elements when present", () => {
      const submission = {
        value: {
          tags: ["ok"],
          scores: [{ value: 50, label: 999 }], // label should be string if present
        },
      };
      const expectedErrors: Partial<
        Record<Paths<Schema.Schema.Encoded<typeof ArraySchema>>, string>
      > = {
        "scores.0.label": "Expected undefined, actual 999",
      };
      // @ts-expect-error - invalid label type in optional label field
      expect(validateArray(submission)).toEqual(expectedErrors);
    });

    it("should return errors if the field is not an array", () => {
      const submission = {
        value: {
          tags: "not-an-array",
          scores: [{ value: 10 }],
        },
      };
      const expectedErrors: Partial<
        Record<Paths<Schema.Schema.Encoded<typeof ArraySchema>>, string>
      > = {
        tags: 'Expected ReadonlyArray<string>, actual "not-an-array"',
      };
      // @ts-expect-error
      expect(validateArray(submission)).toEqual(expectedErrors);
    });
  });

  // --- Constraints Schema Tests ---
  describe("Constraints Schema", () => {
    const validateConstraints = validateWithSchema(ConstraintsSchema);

    it("should return null for valid data respecting constraints", () => {
      const submission = {
        value: {
          email: "test@example.com",
          count: 5,
          description: "This description is definitely long enough.",
        },
      };
      expect(validateConstraints(submission)).toBeNull();
    });

    it("should return null when optional field with constraints is missing", () => {
      const submission = {
        value: {
          email: "test@example.com",
          count: 1,
          // description is missing
        },
      };
      expect(validateConstraints(submission)).toBeNull();
    });

    it("should return errors for violated constraints", () => {
      const submission = {
        value: {
          email: "invalid-email",
          count: -2,
          description: "Too short",
        },
      };
      const expectedErrors: Partial<
        Record<Paths<Schema.Schema.Encoded<typeof ConstraintsSchema>>, string>
      > = {
        email: "Invalid email format",
        count: "Expected a positive number, actual -2",
        description: 'Expected undefined, actual "Too short"',
      };

      expect(validateConstraints(submission)).toEqual(expectedErrors);
    });
  });

  // --- Deep Nesting Tests ---
  describe("Deeply Nested Schema", () => {
    const validateDeep = validateWithSchema(DeepSchema);

    it("should return null for valid deep data", () => {
      const submission = { value: { a: { b: { c: { d: "value" }, e: 5 } } } };
      expect(validateDeep(submission)).toBeNull();
    });

    it("should return null for valid deep data with optional missing", () => {
      const submission = { value: { a: { b: { c: { d: "value" } } } } }; // e is missing
      expect(validateDeep(submission)).toBeNull();
    });

    it("should return errors with correct deep path", () => {
      const submission = { value: { a: { b: { c: { d: 123 } } } } };
      const expectedErrors: Partial<
        Record<Paths<Schema.Schema.Encoded<typeof DeepSchema>>, string>
      > = {
        "a.b.c.d": "Expected string, actual 123",
      };
      // @ts-expect-error
      expect(validateDeep(submission)).toEqual(expectedErrors);
    });

    it("should return errors with correct deep path for optional field", () => {
      const submission = { value: { a: { b: { c: { d: "value" }, e: "wrong" } } } };
      const expectedErrors: Partial<
        Record<Paths<Schema.Schema.Encoded<typeof DeepSchema>>, string>
      > = {
        "a.b.e": 'Expected undefined, actual "wrong"',
      };
      // @ts-expect-error - invalid type for optional field 'e'
      expect(validateDeep(submission)).toEqual(expectedErrors);
    });
  });

  // --- Filter and Brand Schema Test ---
  describe("Filter and Brand Schema", () => {
    const DomainSchema = Schema.String.pipe(
      Schema.filter((s): s is string => /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/.test(s), {
        message: () => "Invalid domain format",
      }),
      Schema.brand("DomainString"),
    );

    class FilterBrandSchema extends Schema.Class<FilterBrandSchema>("FilterBrandSchema")({
      domain: DomainSchema,
      type: Schema.Literal("one", "two"),
    }) {}

    const validateFilterBrand = validateWithSchema(FilterBrandSchema);

    it("should return null for valid data matching filter and literal", () => {
      const submission = {
        value: {
          domain: "example.com",
          type: "one" as const,
        },
      };
      expect(validateFilterBrand(submission)).toBeNull();
    });

    it("should return an error if the filter condition is not met", () => {
      const submission = {
        value: {
          domain: "invalid-domain",
          type: "two" as const,
        },
      };
      const expectedErrors: Partial<
        Record<Paths<Schema.Schema.Encoded<typeof FilterBrandSchema>>, string>
      > = {
        domain: "Invalid domain format",
      };
      expect(validateFilterBrand(submission)).toEqual(expectedErrors);
    });

    it("should return an error if the literal value is incorrect", () => {
      const submission = {
        value: {
          domain: "test.org",
          type: "three" as const,
        },
      };
      const expectedErrors: Partial<
        Record<Paths<Schema.Schema.Encoded<typeof FilterBrandSchema>>, string>
      > = {
        type: 'Expected "two", actual "three"',
      };
      // @ts-expect-error - Intentionally passing invalid type literal 'three'
      expect(validateFilterBrand(submission)).toEqual(expectedErrors);
    });

    it("should return multiple errors if both filter and literal fail", () => {
      const submission = { value: { domain: "nodot", type: "four" } };
      const expectedErrors: Partial<
        Record<Paths<Schema.Schema.Encoded<typeof FilterBrandSchema>>, string>
      > = {
        domain: "Invalid domain format",
        type: 'Expected "two", actual "four"',
      };
      // @ts-expect-error - Intentionally passing invalid type literal 'four'
      expect(validateFilterBrand(submission)).toEqual(expectedErrors);
    });

    it("should return error for missing required branded field", () => {
      const submission = { value: { type: "one" as const } };
      const expectedErrors: Partial<
        Record<Paths<Schema.Schema.Encoded<typeof FilterBrandSchema>>, string>
      > = {
        domain: "is missing",
      };
      // @ts-expect-error - domain is missing
      expect(validateFilterBrand(submission)).toEqual(expectedErrors);
    });
  });

  // --- Root Level Errors (Filters/Refinements) ---
  describe("Root Level Errors (Filters/Refinements)", () => {
    const PasswordSchema = Schema.Struct({
      password: Schema.String,
      confirmPassword: Schema.String,
    }).pipe(
      Schema.filter((input) => input.password === input.confirmPassword, {
        message: () => "Passwords do not match",
      }),
    );

    const validatePassword = validateWithSchema(PasswordSchema);

    it("should return null if root refinement passes", () => {
      const submission = { value: { password: "password123", confirmPassword: "password123" } };
      expect(validatePassword(submission)).toBeNull();
    });

    it("should return a root error if the refinement fails", () => {
      const submission = { value: { password: "password123", confirmPassword: "different" } };
      const expectedErrors: Partial<
        Record<Paths<Schema.Schema.Encoded<typeof PasswordSchema>> | "", string>
      > = {
        "": "Passwords do not match",
      };
      expect(validatePassword(submission)).toEqual(expectedErrors);
    });

    it("should return field errors alongside root errors if both fail", () => {
      const ComplexRootSchema = Schema.Struct({
        value: Schema.Number,
        limit: Schema.Number,
      }).pipe(
        Schema.filter((input) => input.value <= input.limit, {
          message: () => "Value cannot exceed limit",
        }),
      );

      const validateComplexRoot = validateWithSchema(ComplexRootSchema);

      const submission = { value: { value: "not-a-number", limit: 5 } };
      const expectedErrors: Partial<
        Record<Paths<Schema.Schema.Encoded<typeof ComplexRootSchema>> | "", string>
      > = {
        value: 'Expected number, actual "not-a-number"',
      };
      // @ts-expect-error
      expect(validateComplexRoot(submission)).toEqual(expectedErrors);

      const submissionRefinementFail = { value: { value: 10, limit: 5 } };
      const expectedErrorsRefinementFail: Partial<
        Record<Paths<Schema.Schema.Encoded<typeof ComplexRootSchema>> | "", string>
      > = {
        "": "Value cannot exceed limit",
      };
      expect(validateComplexRoot(submissionRefinementFail)).toEqual(expectedErrorsRefinementFail);

      const submissionBothFail = { value: { value: "abc", limit: 5 } };
      const expectedErrorsBothFail: Partial<
        Record<Paths<Schema.Schema.Encoded<typeof ComplexRootSchema>> | "", string>
      > = {
        value: 'Expected number, actual "abc"',
      };
      // @ts-expect-error
      expect(validateComplexRoot(submissionBothFail)).toEqual(expectedErrorsBothFail);
    });

    it("should return only field errors if refinement passes but fields have errors", () => {
      const submission = { value: { password: 123, confirmPassword: 123 } };
      const expectedErrors: Partial<
        Record<Paths<Schema.Schema.Encoded<typeof PasswordSchema>> | "", string>
      > = {
        password: "Expected string, actual 123",
        confirmPassword: "Expected string, actual 123",
      };
      // @ts-expect-error
      expect(validatePassword(submission)).toEqual(expectedErrors);
    });
  });
});
