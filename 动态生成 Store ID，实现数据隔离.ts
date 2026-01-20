import { store } from '@/store'
import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import router from '@/router'
import * as panoramicApi from '@/api/system/worksManagement'
import type {
  SceneVO,
  PanoranaxVO,
  SceneResourceVO,
  SceneConfVO
} from '@/api/system/worksManagement'

const defaultStatus = {
  id: undefined,
  minFor: 1,
  maxFov: 100,
  fovVal: 50,
  minVerticalFov: -90,
  maxVerticalFov: 90,
  verticalFovVal: 0,
  yawMin: -180,
  yawMax: 180,
  yawVal: 0
}
export const usePanoramicStore = (pinia?: any) => {
  const route = computed(() => router.currentRoute.value)
  const sceneId = (route.value.query.id as string) || (route.value.params.id as string) || 'default'

  //  动态生成 Store ID，实现数据隔离
  const instanceId = `panoramic_${sceneId}`
  return defineStore(instanceId, () => {
    // --- State ---
    // const isWhiteRouter = ref(route.path.startsWith('/panoramicView'))
    const isWhiteRouter = computed(() => route.value.path.startsWith('/panoramicView'))
    const queryRouterParams = computed(() => ({ ...route.value.query, ...route.value.params }))
    const isResetPosition = ref(false)
    const diffUpdate = ref(false)
    const sceneGroup = ref<Array<PanoranaxVO>>([])
    const filterEmptySceneGroup = ref<Array<PanoranaxVO>>([])
    const sceneTwoGroup = ref<Array<PanoranaxVO>>([])
    const sceneList = ref<Array<SceneVO>>([])
    const sceneResource = ref<SceneResourceVO | null>(null)
    const projectInfo = ref<any>()

    const baseInfo = ref<SceneVO>({
      sceneName: '',
      sceneDate: '',
      description: ''
    })

    const sceneConf = ref<SceneConfVO>({ ...defaultStatus })

    const originSceneConf = ref<SceneConfVO>({} as SceneConfVO)

    // --- Getters (使用 computed) ---
    const getBaseInfo = computed(() => baseInfo.value)
    const getSceneConfParams = computed(() => sceneConf.value)
    const getOriginSceneConf = computed(() => originSceneConf.value)
    const getSceneGroup = computed(() => sceneGroup.value)
    const getFilterEmptySceneGroup = computed(() => filterEmptySceneGroup.value)
    const getSceneData = computed(() => sceneList.value)
    const getSceneResourceData = computed(() => sceneResource.value)

    // --- Actions ---
    const resetSceneConf = () => {
      Object.assign(sceneConf.value, defaultStatus)
    }
    const setIsResetPosition = (flag: boolean) => {
      isResetPosition.value = flag
    }
    const setDiffUpdate = (flag: boolean) => {
      diffUpdate.value = flag
    }
    const setprojectInfo = (params) => {
      projectInfo.value = params
    }

    const setSceneConf = (params: Partial<SceneConfVO>) => {
      Object.assign(sceneConf.value, params)
    }

    const setBaseInfo = (params: Partial<SceneVO>) => {
      Object.assign(baseInfo.value, params)
    }

    const getSceneGroupTree = async (params: any) => {
      if (isWhiteRouter.value) {
        const data =
          (await panoramicApi.getSceneShareGroupTree({
            ...queryRouterParams.value,
            ...params
          })) || []
        filterEmptySceneGroup.value = filterEmptySceneGroupMethod(data)
      } else {
        // sceneGroup.value = (await panoramicApi.getSceneGroupTree(params)) || []
        const data = (await panoramicApi.getSceneSceneAll(params)) || []
        sceneGroup.value = data
        filterEmptySceneGroup.value = filterEmptySceneGroupMethod(data)
      }
    }

    const getSceneList = async (params: any) => {
      let data: any = null
      if (isWhiteRouter.value) {
        data = await panoramicApi.getSceneShareList({
          ...params,
          ...queryRouterParams.value
        })
        sceneList.value = data || []
      } else {
        data = await panoramicApi.getSceneList(params)
        sceneList.value = data?.list || []
      }
    }

    const getSceneResourceList = async (id: number) => {
      if (isWhiteRouter.value) {
        sceneResource.value =
          (await panoramicApi.getSceneShareResourceList({
            sceneId: id,
            ...queryRouterParams.value
          })) || null
      } else {
        sceneResource.value = (await panoramicApi.getSceneResourceList(id)) || null
      }
    }

    const getSceneBaseInfo = async (id: number) => {
      if (!isWhiteRouter.value) {
        const res = await panoramicApi.getScene(id)
        Object.assign(baseInfo.value, res)
      }
    }

    const getSceneConf = async (id: number) => {
      resetSceneConf()
      let data: any = null
      if (isWhiteRouter.value) {
        data = await panoramicApi.getSceneShareConf(id, { ...queryRouterParams.value })
      } else {
        data = await panoramicApi.getSceneConf(id)
      }

      if (data) {
        Object.keys(sceneConf.value).forEach((key) => {
          if (data[key] !== null) {
            data[key] = Number(data[key])
            sceneConf.value[key] = data[key]
          }
        })
        // Object.assign(sceneConf.value, data)
      }
      console.log(sceneConf.value)
      originSceneConf.value = { ...sceneConf.value }
    }

    return {
      isWhiteRouter,
      isResetPosition,
      diffUpdate,
      sceneGroup,
      sceneTwoGroup,
      sceneList,
      sceneResource,
      baseInfo,
      projectInfo,
      sceneConf,
      originSceneConf,
      getBaseInfo,
      getSceneConfParams,
      getOriginSceneConf,
      getSceneGroup,
      getFilterEmptySceneGroup,
      getSceneData,
      getSceneResourceData,
      resetSceneConf,
      setIsResetPosition,
      setDiffUpdate,
      setSceneConf,
      setBaseInfo,
      setprojectInfo,
      getSceneGroupTree,
      getSceneList,
      getSceneResourceList,
      getSceneBaseInfo,
      getSceneConf
    }
  })(pinia)
}

const filterEmptySceneGroupMethod = (data: PanoranaxVO[]): PanoranaxVO[] => {
  return data
    .map((item) => {
      //浅拷贝当前对象，避免污染原始数据
      const node = { ...item }

      if (node.sceneGroupList && node.sceneGroupList.length > 0) {
        node.sceneGroupList = filterEmptySceneGroupMethod(node.sceneGroupList)
      }

      const hasImages = node.sceneList && node.sceneList.length > 0
      const hasSubFolders = node.sceneGroupList && node.sceneGroupList.length > 0

      if (hasImages || hasSubFolders) {
        return node
      }
      return null
    })
    .filter((node) => node !== null) as PanoranaxVO[]
}

export const usePanoramicStoreWithOut = () => {
  return usePanoramicStore(store)
}
