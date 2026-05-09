import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import type { ActivityItem, CreatePlanBody, CreateSessionBody, CreateSpotBody, CreateSubscriberBody, DashboardSummary, GetDashboardRecentActivityParams, GetOccupancyReportParams, GetRevenueReportParams, HealthStatus, ListSessionsParams, ListSpotsParams, ListSubscribersParams, ListTransactionsParams, OccupancyBreakdown, OccupancyReport, ParkingSession, ParkingSpot, Plan, RevenueReport, RevenueTrendPoint, Subscriber, Transaction, UpdatePlanBody, UpdateSessionBody, UpdateSpotBody, UpdateSubscriberBody } from "./api.schemas";
import { customFetch } from "../custom-fetch";
import type { ErrorType, BodyType } from "../custom-fetch";
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
/**
 * @summary Health check
 */
export declare const getHealthCheckUrl: () => string;
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List all parking spots
 */
export declare const getListSpotsUrl: (params?: ListSpotsParams) => string;
export declare const listSpots: (params?: ListSpotsParams, options?: RequestInit) => Promise<ParkingSpot[]>;
export declare const getListSpotsQueryKey: (params?: ListSpotsParams) => readonly ["/api/spots", ...ListSpotsParams[]];
export declare const getListSpotsQueryOptions: <TData = Awaited<ReturnType<typeof listSpots>>, TError = ErrorType<unknown>>(params?: ListSpotsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSpots>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listSpots>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListSpotsQueryResult = NonNullable<Awaited<ReturnType<typeof listSpots>>>;
export type ListSpotsQueryError = ErrorType<unknown>;
/**
 * @summary List all parking spots
 */
export declare function useListSpots<TData = Awaited<ReturnType<typeof listSpots>>, TError = ErrorType<unknown>>(params?: ListSpotsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSpots>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a parking spot
 */
export declare const getCreateSpotUrl: () => string;
export declare const createSpot: (createSpotBody: CreateSpotBody, options?: RequestInit) => Promise<ParkingSpot>;
export declare const getCreateSpotMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSpot>>, TError, {
        data: BodyType<CreateSpotBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createSpot>>, TError, {
    data: BodyType<CreateSpotBody>;
}, TContext>;
export type CreateSpotMutationResult = NonNullable<Awaited<ReturnType<typeof createSpot>>>;
export type CreateSpotMutationBody = BodyType<CreateSpotBody>;
export type CreateSpotMutationError = ErrorType<unknown>;
/**
 * @summary Create a parking spot
 */
export declare const useCreateSpot: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSpot>>, TError, {
        data: BodyType<CreateSpotBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createSpot>>, TError, {
    data: BodyType<CreateSpotBody>;
}, TContext>;
/**
 * @summary Get a spot by ID
 */
export declare const getGetSpotUrl: (id: number) => string;
export declare const getSpot: (id: number, options?: RequestInit) => Promise<ParkingSpot>;
export declare const getGetSpotQueryKey: (id: number) => readonly [`/api/spots/${number}`];
export declare const getGetSpotQueryOptions: <TData = Awaited<ReturnType<typeof getSpot>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSpot>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getSpot>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetSpotQueryResult = NonNullable<Awaited<ReturnType<typeof getSpot>>>;
export type GetSpotQueryError = ErrorType<unknown>;
/**
 * @summary Get a spot by ID
 */
export declare function useGetSpot<TData = Awaited<ReturnType<typeof getSpot>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSpot>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update a parking spot
 */
export declare const getUpdateSpotUrl: (id: number) => string;
export declare const updateSpot: (id: number, updateSpotBody: UpdateSpotBody, options?: RequestInit) => Promise<ParkingSpot>;
export declare const getUpdateSpotMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateSpot>>, TError, {
        id: number;
        data: BodyType<UpdateSpotBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateSpot>>, TError, {
    id: number;
    data: BodyType<UpdateSpotBody>;
}, TContext>;
export type UpdateSpotMutationResult = NonNullable<Awaited<ReturnType<typeof updateSpot>>>;
export type UpdateSpotMutationBody = BodyType<UpdateSpotBody>;
export type UpdateSpotMutationError = ErrorType<unknown>;
/**
 * @summary Update a parking spot
 */
export declare const useUpdateSpot: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateSpot>>, TError, {
        id: number;
        data: BodyType<UpdateSpotBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateSpot>>, TError, {
    id: number;
    data: BodyType<UpdateSpotBody>;
}, TContext>;
/**
 * @summary Delete a parking spot
 */
export declare const getDeleteSpotUrl: (id: number) => string;
export declare const deleteSpot: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteSpotMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteSpot>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteSpot>>, TError, {
    id: number;
}, TContext>;
export type DeleteSpotMutationResult = NonNullable<Awaited<ReturnType<typeof deleteSpot>>>;
export type DeleteSpotMutationError = ErrorType<unknown>;
/**
 * @summary Delete a parking spot
 */
export declare const useDeleteSpot: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteSpot>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteSpot>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary List parking sessions
 */
export declare const getListSessionsUrl: (params?: ListSessionsParams) => string;
export declare const listSessions: (params?: ListSessionsParams, options?: RequestInit) => Promise<ParkingSession[]>;
export declare const getListSessionsQueryKey: (params?: ListSessionsParams) => readonly ["/api/sessions", ...ListSessionsParams[]];
export declare const getListSessionsQueryOptions: <TData = Awaited<ReturnType<typeof listSessions>>, TError = ErrorType<unknown>>(params?: ListSessionsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSessions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listSessions>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListSessionsQueryResult = NonNullable<Awaited<ReturnType<typeof listSessions>>>;
export type ListSessionsQueryError = ErrorType<unknown>;
/**
 * @summary List parking sessions
 */
export declare function useListSessions<TData = Awaited<ReturnType<typeof listSessions>>, TError = ErrorType<unknown>>(params?: ListSessionsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSessions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Register vehicle entry
 */
export declare const getCreateSessionUrl: () => string;
export declare const createSession: (createSessionBody: CreateSessionBody, options?: RequestInit) => Promise<ParkingSession>;
export declare const getCreateSessionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSession>>, TError, {
        data: BodyType<CreateSessionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createSession>>, TError, {
    data: BodyType<CreateSessionBody>;
}, TContext>;
export type CreateSessionMutationResult = NonNullable<Awaited<ReturnType<typeof createSession>>>;
export type CreateSessionMutationBody = BodyType<CreateSessionBody>;
export type CreateSessionMutationError = ErrorType<unknown>;
/**
 * @summary Register vehicle entry
 */
export declare const useCreateSession: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSession>>, TError, {
        data: BodyType<CreateSessionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createSession>>, TError, {
    data: BodyType<CreateSessionBody>;
}, TContext>;
/**
 * @summary Get session by ID
 */
export declare const getGetSessionUrl: (id: number) => string;
export declare const getSession: (id: number, options?: RequestInit) => Promise<ParkingSession>;
export declare const getGetSessionQueryKey: (id: number) => readonly [`/api/sessions/${number}`];
export declare const getGetSessionQueryOptions: <TData = Awaited<ReturnType<typeof getSession>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSession>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getSession>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetSessionQueryResult = NonNullable<Awaited<ReturnType<typeof getSession>>>;
export type GetSessionQueryError = ErrorType<unknown>;
/**
 * @summary Get session by ID
 */
export declare function useGetSession<TData = Awaited<ReturnType<typeof getSession>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSession>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update session (register exit / payment)
 */
export declare const getUpdateSessionUrl: (id: number) => string;
export declare const updateSession: (id: number, updateSessionBody: UpdateSessionBody, options?: RequestInit) => Promise<ParkingSession>;
export declare const getUpdateSessionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateSession>>, TError, {
        id: number;
        data: BodyType<UpdateSessionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateSession>>, TError, {
    id: number;
    data: BodyType<UpdateSessionBody>;
}, TContext>;
export type UpdateSessionMutationResult = NonNullable<Awaited<ReturnType<typeof updateSession>>>;
export type UpdateSessionMutationBody = BodyType<UpdateSessionBody>;
export type UpdateSessionMutationError = ErrorType<unknown>;
/**
 * @summary Update session (register exit / payment)
 */
export declare const useUpdateSession: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateSession>>, TError, {
        id: number;
        data: BodyType<UpdateSessionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateSession>>, TError, {
    id: number;
    data: BodyType<UpdateSessionBody>;
}, TContext>;
/**
 * @summary List subscription plans
 */
export declare const getListPlansUrl: () => string;
export declare const listPlans: (options?: RequestInit) => Promise<Plan[]>;
export declare const getListPlansQueryKey: () => readonly ["/api/plans"];
export declare const getListPlansQueryOptions: <TData = Awaited<ReturnType<typeof listPlans>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listPlans>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listPlans>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListPlansQueryResult = NonNullable<Awaited<ReturnType<typeof listPlans>>>;
export type ListPlansQueryError = ErrorType<unknown>;
/**
 * @summary List subscription plans
 */
export declare function useListPlans<TData = Awaited<ReturnType<typeof listPlans>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listPlans>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a subscription plan
 */
export declare const getCreatePlanUrl: () => string;
export declare const createPlan: (createPlanBody: CreatePlanBody, options?: RequestInit) => Promise<Plan>;
export declare const getCreatePlanMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createPlan>>, TError, {
        data: BodyType<CreatePlanBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createPlan>>, TError, {
    data: BodyType<CreatePlanBody>;
}, TContext>;
export type CreatePlanMutationResult = NonNullable<Awaited<ReturnType<typeof createPlan>>>;
export type CreatePlanMutationBody = BodyType<CreatePlanBody>;
export type CreatePlanMutationError = ErrorType<unknown>;
/**
 * @summary Create a subscription plan
 */
export declare const useCreatePlan: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createPlan>>, TError, {
        data: BodyType<CreatePlanBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createPlan>>, TError, {
    data: BodyType<CreatePlanBody>;
}, TContext>;
/**
 * @summary Update a plan
 */
export declare const getUpdatePlanUrl: (id: number) => string;
export declare const updatePlan: (id: number, updatePlanBody: UpdatePlanBody, options?: RequestInit) => Promise<Plan>;
export declare const getUpdatePlanMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updatePlan>>, TError, {
        id: number;
        data: BodyType<UpdatePlanBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updatePlan>>, TError, {
    id: number;
    data: BodyType<UpdatePlanBody>;
}, TContext>;
export type UpdatePlanMutationResult = NonNullable<Awaited<ReturnType<typeof updatePlan>>>;
export type UpdatePlanMutationBody = BodyType<UpdatePlanBody>;
export type UpdatePlanMutationError = ErrorType<unknown>;
/**
 * @summary Update a plan
 */
export declare const useUpdatePlan: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updatePlan>>, TError, {
        id: number;
        data: BodyType<UpdatePlanBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updatePlan>>, TError, {
    id: number;
    data: BodyType<UpdatePlanBody>;
}, TContext>;
/**
 * @summary Delete a plan
 */
export declare const getDeletePlanUrl: (id: number) => string;
export declare const deletePlan: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeletePlanMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deletePlan>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deletePlan>>, TError, {
    id: number;
}, TContext>;
export type DeletePlanMutationResult = NonNullable<Awaited<ReturnType<typeof deletePlan>>>;
export type DeletePlanMutationError = ErrorType<unknown>;
/**
 * @summary Delete a plan
 */
export declare const useDeletePlan: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deletePlan>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deletePlan>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary List monthly subscribers
 */
export declare const getListSubscribersUrl: (params?: ListSubscribersParams) => string;
export declare const listSubscribers: (params?: ListSubscribersParams, options?: RequestInit) => Promise<Subscriber[]>;
export declare const getListSubscribersQueryKey: (params?: ListSubscribersParams) => readonly ["/api/subscribers", ...ListSubscribersParams[]];
export declare const getListSubscribersQueryOptions: <TData = Awaited<ReturnType<typeof listSubscribers>>, TError = ErrorType<unknown>>(params?: ListSubscribersParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSubscribers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listSubscribers>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListSubscribersQueryResult = NonNullable<Awaited<ReturnType<typeof listSubscribers>>>;
export type ListSubscribersQueryError = ErrorType<unknown>;
/**
 * @summary List monthly subscribers
 */
export declare function useListSubscribers<TData = Awaited<ReturnType<typeof listSubscribers>>, TError = ErrorType<unknown>>(params?: ListSubscribersParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSubscribers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a monthly subscriber
 */
export declare const getCreateSubscriberUrl: () => string;
export declare const createSubscriber: (createSubscriberBody: CreateSubscriberBody, options?: RequestInit) => Promise<Subscriber>;
export declare const getCreateSubscriberMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSubscriber>>, TError, {
        data: BodyType<CreateSubscriberBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createSubscriber>>, TError, {
    data: BodyType<CreateSubscriberBody>;
}, TContext>;
export type CreateSubscriberMutationResult = NonNullable<Awaited<ReturnType<typeof createSubscriber>>>;
export type CreateSubscriberMutationBody = BodyType<CreateSubscriberBody>;
export type CreateSubscriberMutationError = ErrorType<unknown>;
/**
 * @summary Create a monthly subscriber
 */
export declare const useCreateSubscriber: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSubscriber>>, TError, {
        data: BodyType<CreateSubscriberBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createSubscriber>>, TError, {
    data: BodyType<CreateSubscriberBody>;
}, TContext>;
/**
 * @summary Get subscriber by ID
 */
export declare const getGetSubscriberUrl: (id: number) => string;
export declare const getSubscriber: (id: number, options?: RequestInit) => Promise<Subscriber>;
export declare const getGetSubscriberQueryKey: (id: number) => readonly [`/api/subscribers/${number}`];
export declare const getGetSubscriberQueryOptions: <TData = Awaited<ReturnType<typeof getSubscriber>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSubscriber>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getSubscriber>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetSubscriberQueryResult = NonNullable<Awaited<ReturnType<typeof getSubscriber>>>;
export type GetSubscriberQueryError = ErrorType<unknown>;
/**
 * @summary Get subscriber by ID
 */
export declare function useGetSubscriber<TData = Awaited<ReturnType<typeof getSubscriber>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSubscriber>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update a subscriber
 */
export declare const getUpdateSubscriberUrl: (id: number) => string;
export declare const updateSubscriber: (id: number, updateSubscriberBody: UpdateSubscriberBody, options?: RequestInit) => Promise<Subscriber>;
export declare const getUpdateSubscriberMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateSubscriber>>, TError, {
        id: number;
        data: BodyType<UpdateSubscriberBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateSubscriber>>, TError, {
    id: number;
    data: BodyType<UpdateSubscriberBody>;
}, TContext>;
export type UpdateSubscriberMutationResult = NonNullable<Awaited<ReturnType<typeof updateSubscriber>>>;
export type UpdateSubscriberMutationBody = BodyType<UpdateSubscriberBody>;
export type UpdateSubscriberMutationError = ErrorType<unknown>;
/**
 * @summary Update a subscriber
 */
export declare const useUpdateSubscriber: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateSubscriber>>, TError, {
        id: number;
        data: BodyType<UpdateSubscriberBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateSubscriber>>, TError, {
    id: number;
    data: BodyType<UpdateSubscriberBody>;
}, TContext>;
/**
 * @summary Delete a subscriber
 */
export declare const getDeleteSubscriberUrl: (id: number) => string;
export declare const deleteSubscriber: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteSubscriberMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteSubscriber>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteSubscriber>>, TError, {
    id: number;
}, TContext>;
export type DeleteSubscriberMutationResult = NonNullable<Awaited<ReturnType<typeof deleteSubscriber>>>;
export type DeleteSubscriberMutationError = ErrorType<unknown>;
/**
 * @summary Delete a subscriber
 */
export declare const useDeleteSubscriber: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteSubscriber>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteSubscriber>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary List financial transactions
 */
export declare const getListTransactionsUrl: (params?: ListTransactionsParams) => string;
export declare const listTransactions: (params?: ListTransactionsParams, options?: RequestInit) => Promise<Transaction[]>;
export declare const getListTransactionsQueryKey: (params?: ListTransactionsParams) => readonly ["/api/transactions", ...ListTransactionsParams[]];
export declare const getListTransactionsQueryOptions: <TData = Awaited<ReturnType<typeof listTransactions>>, TError = ErrorType<unknown>>(params?: ListTransactionsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTransactions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listTransactions>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListTransactionsQueryResult = NonNullable<Awaited<ReturnType<typeof listTransactions>>>;
export type ListTransactionsQueryError = ErrorType<unknown>;
/**
 * @summary List financial transactions
 */
export declare function useListTransactions<TData = Awaited<ReturnType<typeof listTransactions>>, TError = ErrorType<unknown>>(params?: ListTransactionsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTransactions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get dashboard summary metrics
 */
export declare const getGetDashboardSummaryUrl: () => string;
export declare const getDashboardSummary: (options?: RequestInit) => Promise<DashboardSummary>;
export declare const getGetDashboardSummaryQueryKey: () => readonly ["/api/dashboard/summary"];
export declare const getGetDashboardSummaryQueryOptions: <TData = Awaited<ReturnType<typeof getDashboardSummary>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDashboardSummary>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDashboardSummaryQueryResult = NonNullable<Awaited<ReturnType<typeof getDashboardSummary>>>;
export type GetDashboardSummaryQueryError = ErrorType<unknown>;
/**
 * @summary Get dashboard summary metrics
 */
export declare function useGetDashboardSummary<TData = Awaited<ReturnType<typeof getDashboardSummary>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get spot occupancy breakdown by type
 */
export declare const getGetDashboardOccupancyUrl: () => string;
export declare const getDashboardOccupancy: (options?: RequestInit) => Promise<OccupancyBreakdown[]>;
export declare const getGetDashboardOccupancyQueryKey: () => readonly ["/api/dashboard/occupancy"];
export declare const getGetDashboardOccupancyQueryOptions: <TData = Awaited<ReturnType<typeof getDashboardOccupancy>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardOccupancy>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDashboardOccupancy>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDashboardOccupancyQueryResult = NonNullable<Awaited<ReturnType<typeof getDashboardOccupancy>>>;
export type GetDashboardOccupancyQueryError = ErrorType<unknown>;
/**
 * @summary Get spot occupancy breakdown by type
 */
export declare function useGetDashboardOccupancy<TData = Awaited<ReturnType<typeof getDashboardOccupancy>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardOccupancy>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get daily revenue for last 30 days
 */
export declare const getGetDashboardRevenueTrendUrl: () => string;
export declare const getDashboardRevenueTrend: (options?: RequestInit) => Promise<RevenueTrendPoint[]>;
export declare const getGetDashboardRevenueTrendQueryKey: () => readonly ["/api/dashboard/revenue-trend"];
export declare const getGetDashboardRevenueTrendQueryOptions: <TData = Awaited<ReturnType<typeof getDashboardRevenueTrend>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardRevenueTrend>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDashboardRevenueTrend>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDashboardRevenueTrendQueryResult = NonNullable<Awaited<ReturnType<typeof getDashboardRevenueTrend>>>;
export type GetDashboardRevenueTrendQueryError = ErrorType<unknown>;
/**
 * @summary Get daily revenue for last 30 days
 */
export declare function useGetDashboardRevenueTrend<TData = Awaited<ReturnType<typeof getDashboardRevenueTrend>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardRevenueTrend>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get recent vehicle entries and exits
 */
export declare const getGetDashboardRecentActivityUrl: (params?: GetDashboardRecentActivityParams) => string;
export declare const getDashboardRecentActivity: (params?: GetDashboardRecentActivityParams, options?: RequestInit) => Promise<ActivityItem[]>;
export declare const getGetDashboardRecentActivityQueryKey: (params?: GetDashboardRecentActivityParams) => readonly ["/api/dashboard/recent-activity", ...GetDashboardRecentActivityParams[]];
export declare const getGetDashboardRecentActivityQueryOptions: <TData = Awaited<ReturnType<typeof getDashboardRecentActivity>>, TError = ErrorType<unknown>>(params?: GetDashboardRecentActivityParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardRecentActivity>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDashboardRecentActivity>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDashboardRecentActivityQueryResult = NonNullable<Awaited<ReturnType<typeof getDashboardRecentActivity>>>;
export type GetDashboardRecentActivityQueryError = ErrorType<unknown>;
/**
 * @summary Get recent vehicle entries and exits
 */
export declare function useGetDashboardRecentActivity<TData = Awaited<ReturnType<typeof getDashboardRecentActivity>>, TError = ErrorType<unknown>>(params?: GetDashboardRecentActivityParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardRecentActivity>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Revenue report grouped by period
 */
export declare const getGetRevenueReportUrl: (params?: GetRevenueReportParams) => string;
export declare const getRevenueReport: (params?: GetRevenueReportParams, options?: RequestInit) => Promise<RevenueReport>;
export declare const getGetRevenueReportQueryKey: (params?: GetRevenueReportParams) => readonly ["/api/reports/revenue", ...GetRevenueReportParams[]];
export declare const getGetRevenueReportQueryOptions: <TData = Awaited<ReturnType<typeof getRevenueReport>>, TError = ErrorType<unknown>>(params?: GetRevenueReportParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRevenueReport>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getRevenueReport>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetRevenueReportQueryResult = NonNullable<Awaited<ReturnType<typeof getRevenueReport>>>;
export type GetRevenueReportQueryError = ErrorType<unknown>;
/**
 * @summary Revenue report grouped by period
 */
export declare function useGetRevenueReport<TData = Awaited<ReturnType<typeof getRevenueReport>>, TError = ErrorType<unknown>>(params?: GetRevenueReportParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRevenueReport>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Occupancy rate report
 */
export declare const getGetOccupancyReportUrl: (params?: GetOccupancyReportParams) => string;
export declare const getOccupancyReport: (params?: GetOccupancyReportParams, options?: RequestInit) => Promise<OccupancyReport>;
export declare const getGetOccupancyReportQueryKey: (params?: GetOccupancyReportParams) => readonly ["/api/reports/occupancy", ...GetOccupancyReportParams[]];
export declare const getGetOccupancyReportQueryOptions: <TData = Awaited<ReturnType<typeof getOccupancyReport>>, TError = ErrorType<unknown>>(params?: GetOccupancyReportParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getOccupancyReport>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getOccupancyReport>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetOccupancyReportQueryResult = NonNullable<Awaited<ReturnType<typeof getOccupancyReport>>>;
export type GetOccupancyReportQueryError = ErrorType<unknown>;
/**
 * @summary Occupancy rate report
 */
export declare function useGetOccupancyReport<TData = Awaited<ReturnType<typeof getOccupancyReport>>, TError = ErrorType<unknown>>(params?: GetOccupancyReportParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getOccupancyReport>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export {};
//# sourceMappingURL=api.d.ts.map