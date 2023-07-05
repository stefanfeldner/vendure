import { Type as ComponentType } from '@angular/core';
import { LocalizedString } from '@vendure/common/lib/generated-types';
import { assertNever } from '@vendure/common/lib/shared-utils';
import { FormInputComponent } from '../../common/component-registry-types';
import {
    BooleanOperators,
    DateOperators,
    NumberOperators,
    StringOperators,
} from '../../common/generated-types';

export interface DataTableFilterTextType {
    kind: 'text';
    placeholder?: string;
}

export interface DataTableFilterSelectType {
    kind: 'select';
    options: Array<{ value: any; label: string }>;
}

export interface DataTableFilterBooleanType {
    kind: 'boolean';
}

export interface DataTableFilterNumberType {
    kind: 'number';
    inputType?: 'number' | 'currency';
}

export interface DataTableFilterDateRangeType {
    kind: 'dateRange';
}

export interface DataTableFilterCustomType {
    kind: 'custom';
    component: ComponentType<FormInputComponent>;
    serializeValue: (value: any) => string;
    deserializeValue: (serialized: string) => any;
    getLabel(value: any): string | Promise<string>;
}

export type KindValueMap = {
    text: {
        raw: {
            operator: keyof StringOperators;
            term: string;
        };
        input: StringOperators;
    };
    select: { raw: string[]; input: StringOperators };
    boolean: { raw: boolean; input: BooleanOperators };
    dateRange: { raw: { start?: string; end?: string }; input: DateOperators };
    number: { raw: { operator: keyof NumberOperators; amount: number }; input: NumberOperators };
    custom: { raw: any; input: any };
};
export type DataTableFilterType =
    | DataTableFilterTextType
    | DataTableFilterSelectType
    | DataTableFilterBooleanType
    | DataTableFilterDateRangeType
    | DataTableFilterNumberType
    | DataTableFilterCustomType;

export interface DataTableFilterOptions<
    FilterInput extends Record<string, any> = any,
    Type extends DataTableFilterType = DataTableFilterType,
> {
    readonly name: string;
    readonly type: Type;
    readonly label: string | LocalizedString[];
    readonly filterField?: keyof FilterInput;
    readonly toFilterInput?: (value: DataTableFilterValue<Type>) => Partial<FilterInput>;
}

export type DataTableFilterValue<Type extends DataTableFilterType> = KindValueMap[Type['kind']]['raw'];
export type DataTableFilterOperator<Type extends DataTableFilterType> = KindValueMap[Type['kind']]['input'];

export class DataTableFilter<
    FilterInput extends Record<string, any> = any,
    Type extends DataTableFilterType = DataTableFilterType,
> {
    constructor(
        private readonly options: DataTableFilterOptions<FilterInput, Type>,
        private onActivate?: (
            filter: DataTableFilter<FilterInput, Type>,
            value: DataTableFilterValue<Type> | undefined,
        ) => void,
    ) {}

    get name(): string {
        return this.options.name;
    }

    get type(): Type {
        return this.options.type;
    }

    get label(): string | LocalizedString[] {
        return this.options.label;
    }

    getFilterOperator(value: any): DataTableFilterOperator<Type> {
        const type = this.options.type;
        switch (type.kind) {
            case 'boolean':
                return {
                    eq: !!value,
                };
            case 'dateRange': {
                let dateOperators: DateOperators;
                const start = value.start ?? undefined;
                const end = value.end ?? undefined;
                if (start && end) {
                    dateOperators = {
                        between: { start, end },
                    };
                } else if (start) {
                    dateOperators = {
                        after: start,
                    };
                } else {
                    dateOperators = {
                        before: end,
                    };
                }
                return dateOperators;
            }
            case 'number':
                return {
                    [value.operator]: Number(value.amount),
                };

            case 'select':
                return { in: value };
            case 'text':
                return {
                    [value.operator]: value.term,
                };
            case 'custom': {
                return value;
            }
            default:
                assertNever(type);
        }
    }

    toFilterInput(value: DataTableFilterValue<Type>): Partial<FilterInput> {
        if (this.options.toFilterInput) {
            return this.options.toFilterInput(value);
        }
        if (this.options.filterField) {
            return { [this.options.filterField]: this.getFilterOperator(value) } as Partial<FilterInput>;
        } else {
            throw new Error(
                `Either "filterField" or "toFilterInput" must be provided (for filter "${this.name}"))`,
            );
        }
    }

    activate(value: DataTableFilterValue<Type>) {
        if (this.onActivate) {
            this.onActivate(this, value);
        }
    }

    isText(): this is DataTableFilter<FilterInput, DataTableFilterTextType> {
        return this.type.kind === 'text';
    }

    isNumber(): this is DataTableFilter<FilterInput, DataTableFilterNumberType> {
        return this.type.kind === 'number';
    }

    isBoolean(): this is DataTableFilter<FilterInput, DataTableFilterBooleanType> {
        return this.type.kind === 'boolean';
    }

    isSelect(): this is DataTableFilter<FilterInput, DataTableFilterSelectType> {
        return this.type.kind === 'select';
    }

    isDateRange(): this is DataTableFilter<FilterInput, DataTableFilterDateRangeType> {
        return this.type.kind === 'dateRange';
    }

    isCustom(): this is DataTableFilter<FilterInput, DataTableFilterCustomType> {
        return this.type.kind === 'custom';
    }
}
