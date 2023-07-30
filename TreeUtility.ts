//@ts-nocheck
import { Tab, Tabs, styled } from "@material-ui/core"
import { IBucket } from "interfaces/commonInterfaces"
import { ICategoryPageNum, IDocumentCategory, IPageNumberBucket, IPageNumberCategory, ITreeNodeType } from "interfaces/multiDocClassifierInterfaces";
import { ITasks } from "interfaces/tableDrawingInterfaces";
import { IScreenTemplate } from "interfaces/uiWorkFlowInterfaces";


export type ContextMenuComponentType = {
  Node: ITreeNodeType,
  HandleContextOnclick: (node: ITreeNodeType) => void
}

export type ContextComponentProps = {
  El: HTMLElement | null,
  HandleContextOnclick: (node: ITreeNodeType) => void,
}

type PDFKEY = number | string;
type PDFLIST = Record<PDFKEY, string[]>

export const FindNode = (id: string, list: ITreeNodeType[] | any): any => {
  if (list?.length > 0) {
    let FoundItem;
    let Fund = false
    for (let i = 0; i < list?.length; i++) {
      if (!Fund) {
        if (list[i]?.id == id) {
          Fund = true
          FoundItem = list[i]
          break;
        }
        else {
          if (list[i]?.children && list[i]?.children?.length > 0) {
            FoundItem = FindNode(id, list[i]?.children);
            if (FoundItem) {
              break;
            }
          }
        }
      }
      else {
        break;
      }
    }
    return FoundItem
  }
}

export const ValidatePageInput = (input: string): boolean => {
  // Remove any leading/trailing white spaces
  input = input.trim();
  let regex: RegExp = /^(\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*|\d+)$/;
  let Status: boolean = regex.test(input)
  return Status;
}

export const PdfExtractor = (list: string[]): any => {
  let Obj: PDFLIST = {};
  list?.map((item: string) => {
    if (!Obj[item?.substring(0, item?.indexOf("-"))]) {
      Obj[item?.substring(0, item?.indexOf("-"))] = [item]
    } else {
      Obj[item?.substring(0, item?.indexOf("-"))] = [...Obj[item?.substring(0, item?.indexOf("-"))], item]
    }
  });
  return Obj
}

type IHandleContextOnclickType = {
  ModifiedTreeData: ITreeNodeType[],
  PageNumberCategory: Record<string, Record<string, string[] | string>>,
  TargetNode_name: string,
  CategoryPageNum: Record<string, string[]>,
  UnChangedNodes: ITreeNodeType[]
}



type IHandleContextOnclickTypeNull = {
  NoChange: boolean,
  UnChangedNodes: ITreeNodeType[]
}

export const HandleMoveNodes = (
  val: ITreeNodeType,
  treeData: ITreeNodeType[],
  selectedNodes: ITreeNodeType[],
  pageNumberCategory: IPageNumberCategory,
  categoryPageNum: ICategoryPageNum,
): IHandleContextOnclickType | IHandleContextOnclickTypeNull => {
  // try {
  let TargetNode = val;
  let FilteredNodes:ITreeNodeType[] = selectedNodes.filter(node => {
    console.log(node.parentPath[0], val.parentPath[0], "handleMove3")
    if (node.parentPath[0] === val.parentPath[0]) {
      if (node.parentTitle !== val.id) {
        return true
      }
    } else {
      return true
    }

  });
  let UnChangedNodes = selectedNodes.filter(node => node.parentTitle === val.id);
  console.log(UnChangedNodes, "handleMove1", TargetNode)
  console.log(FilteredNodes, "handleMove2")
  if (FilteredNodes.length === 0) return {
    NoChange: true,
    UnChangedNodes
  }
  const TargetNodeParentPath: string = TargetNode?.parentPath[0];
  const ChangedTree: ITreeNodeType[] = treeData?.filter(item => item.id === TargetNodeParentPath)
  const FoundTarget = FindNode(TargetNode.id, ChangedTree);
  console.log(FoundTarget, "HandleMove4")
  console.log(pageNumberCategory, "HandleMove4.2")
  FilteredNodes.forEach((node: ITreeNodeType) => {
    pageNumberCategory[node.id].category = TargetNode.parentPath[1] ?? TargetNode.title;
    pageNumberCategory[node.id].subCategories = [];
    if (node.category) {
      let index = categoryPageNum[node.category].indexOf(node.id);
      categoryPageNum[node.category].splice(index, 1);
      if (categoryPageNum[node.category].length === 0) {
        delete categoryPageNum[node.category];
      }
      categoryPageNum[TargetNode.parentPath[1] ?? TargetNode.id].push(node.id);
    }
  })
  let nodes: ITreeNodeType[] = FilteredNodes.map((node: ITreeNodeType) =>
    node = {
      ...node,
      category: TargetNode.parentPath[1] ?? TargetNode.title,
      subCategories: [],
      isSelected: false,
      parentPath: [...TargetNode.parentPath, TargetNode.title].flat()
    });
  console.log(nodes, "HandleMove5")
  let children = FoundTarget.children;
  FoundTarget.children = [...children, ...nodes]
  let groupedObj: Record<string, ITreeNodeType[]> = {};
  for (const obj of nodes) {
    const { parentTitle, ...rest } = obj;
    const title: string = parentTitle!;
    if (groupedObj[title]) {
      groupedObj[title].push(rest);
    } else {
      groupedObj[title] = [rest];
    }
  }
  console.log(groupedObj, "HandleMove6")
  let ModifyPrevParent = Object.keys(groupedObj);
  ModifyPrevParent.forEach((item) => {

    let fill = selectedNodes?.filter(node => node.id === groupedObj[item][0]['id'])
    let Applicant = fill[0]?.parentPath[0]
    const FoundParent = FindNode(item, treeData?.filter(app => app.id === Applicant))
    console.log(FoundParent, "HandleMove9")

    let ResultObj = FoundParent?.children.filter((obj1: ITreeNodeType) => !nodes.some((obj2) => obj2.id === obj1.id));
    FoundParent.children = ResultObj

    if (FoundParent.children.length === 0) {
      let RootNode = FindNode(FoundParent.parentPath[0], treeData)
      let indexOfEmptyNode = RootNode.children.indexOf(FoundParent);
      RootNode.children.splice(indexOfEmptyNode, 1)
    }
  });

  return {
    ModifiedTreeData: treeData,
    PageNumberCategory: pageNumberCategory,
    TargetNode_name: TargetNode.parentPath[1] ?? TargetNode.title ?? '',
    CategoryPageNum: categoryPageNum,
    UnChangedNodes
  }

  // } catch (error) {
  //   console.log(error, "handlemoverrror")
  //   alert('error')
  // }
}


export const ChangeIsSelected = (UnChangedNodes: ITreeNodeType[], Tree: ITreeNodeType[]): void => {
  let UnChange: ITreeNodeType[] = UnChangedNodes;
  UnChange && UnChange.length !== 0 && UnChange.forEach(Unode => {
    let FoundChange = FindNode(Unode.id, Tree);
    FoundChange.isSelected = false
  })
}


function SanitizeTaskData(TaskData: Array<ITasks>) {
  const delimiter = ".";
  const pageNumberCategory: IPageNumberCategory = {}
  const filePathObject: Record<string, string> = {};
  let categoryPageNum: ICategoryPageNum = {};
  TaskData.forEach((item) => {
    item?.pages.forEach((val) => {
      const categories = val.classification.dpaText.dpCorrected ? val.classification.dpaText.dpCorrected : (val.classification.dpaText.mlCorrected ? val.classification.dpaText.mlCorrected : val.classification.dpaText.orig);
      const categoryArray = categories.split(delimiter);
      const classification = categoryArray[0].split("_").join(" ");

      const subCategoryArray = []
      if (categoryArray.length > 1) {
        for (let i = 1; i < categoryArray.length; i++) {
          subCategoryArray.push(categoryArray[i].split('_').join(" "));
        }
      }
      let currentPage = String(item.taskId) + "-" + String(val.pageNumber) as string
      if (!filePathObject[currentPage]) {
        filePathObject[currentPage] = val.filePath;
      }

      pageNumberCategory[currentPage] = { "category": categoryArray[0].split('_').join(" "), "subCategories": subCategoryArray }

      if (categoryPageNum[classification]) {
        categoryPageNum[classification] = [...categoryPageNum[classification], currentPage]
      }
      else {
        categoryPageNum[classification] = [currentPage];
      }
      if (categoryPageNum['ALL']) {
        categoryPageNum['ALL'] = [...categoryPageNum['ALL'], currentPage]
      }
      else {
        categoryPageNum['ALL'] = [currentPage];
      }
    })
  })

  return {
    pageNumberCategory,
    categoryPageNum,
    filePathObject
  }
}

function TreeData(buckets: Array<IBucket>, PageNumberCategory: IPageNumberCategory) {
  let mainTree: TreeNodeType[] = [];
  let pageNumberBucket: IPageNumberBucket = {}
  buckets.forEach((item) => {
    const nameParts = item.name.split(".");
    let ParentFolder = {}
    nameParts.map((name: string, index: number) => {
      name = name.split("_").join(" ");
      console.log(name)
      if (mainTree?.length !== 0) {
        if (index == 0) {
          const Found = mainTree.filter(node => node.id === name);
          if (Found?.length === 0) {
            const ParentNode = {
              id: name,
              title: name,
              parentPath: [],
              editable: index == 2 ? true : false,
              folder: true,
              children: []
            };
            ParentFolder = ParentNode
            mainTree.push(ParentNode)
          } else {
            ParentFolder = Found[0]
          }
        }
        else {
          const existingFolder = FindNode(name, ParentFolder.children);
          if (!existingFolder) {
            if (index === nameParts.length - 1) {
              let path = ParentFolder?.parentPath?.length !== 0 ? [...ParentFolder?.parentPath, ParentFolder?.id] : [ParentFolder?.id] ?? [];
              const Parent = FindNode(path[index - 1], mainTree);
              const newFolder = {
                id: name,
                title: name,
                parentPath: path,
                editable: index === 2 ? true : false,
                folder: true,
                children: [],
                templateId: item.templateId
              };
              item.entities.forEach((entity) => {
                newFolder.children.push({
                  id: String(entity.taskId) + "-" + String(entity.pageNumber),
                  Page: entity.pageNumber,
                  taskId: entity.taskId,
                  parentPath: [...path, name],
                  title: "Page - " + "(" + String(entity.taskId) + ") - " + String(entity.pageNumber),
                  isSelected: false,
                  folder: false,
                  category: PageNumberCategory[String(entity.taskId) + "-" + String(entity.pageNumber)].category,
                  subCategories: PageNumberCategory[String(entity.taskId) + "-" + String(entity.pageNumber)].subCategories,
                  templateId: item.templateId
                });
                pageNumberBucket[String(entity.taskId) + "-" + String(entity.pageNumber)] = [...path, name]
              });
              Parent?.children?.push(newFolder);
              ParentFolder = newFolder
            }
            else {
              let path = ParentFolder?.parentPath?.length !== 0 ? [...ParentFolder?.parentPath, ParentFolder?.id] : [ParentFolder?.id] ?? [];
              const Parent = FindNode(path[index - 1], mainTree);
              const newFolder = {
                id: name,
                title: name,
                parentPath: path,
                editable: index === 2 ? true : false,
                folder: true,
                children: [],
                templateId: item.templateId
              };
              Parent?.children?.push(newFolder);
              ParentFolder = newFolder
            }
          } else {
            if (nameParts[0].split("_").join(" ") === existingFolder.parentPath[0]) {
              let Arr = []
              let path = existingFolder.parentPath
              item.entities.forEach((entity) => {
                Arr.push({
                  Page: entity.pageNumber,
                  id: String(entity.taskId) + "-" + String(entity.pageNumber),
                  taskId: entity.taskId,
                  parentPath: [...path, name],
                  title: "Page - " + "(" + String(entity.taskId) + ") - " + String(entity.pageNumber),
                  isSelected: false,
                  folder: false,
                  category: PageNumberCategory[String(entity.taskId) + "-" + String(entity.pageNumber)].category,
                  subCategories: PageNumberCategory[String(entity.taskId) + "-" + String(entity.pageNumber)].subCategories,
                  templateId: item.templateId
                });
                pageNumberBucket[String(entity.taskId) + "-" + String(entity.pageNumber)] = [...path, name]
              });
              existingFolder.children = [...existingFolder.children, ...Arr]
            }
          }
        }
      } else {
        const ParentNode = {
          id: name,
          title: name,
          parentPath: [],
          editable: index === 2 ? true : false,
          folder: true,
          children: []
        };
        ParentFolder = ParentNode
        mainTree.push(ParentNode)
      }
    })
  });
  return {
    mainTree,
    pageNumberBucket,

  };
}

export const PreProcessedTreeData = (buckets: Array<IBucket>, TaskData: Array<ITasks>) => {

  let treeView: ITreeNodeType[] = [];
  let pageNumberCategory: IPageNumberCategory = [];
  let categoryPageNum: ICategoryPageNum = [];
  let filePathObject: Record<string, string> = {};
  let pageNumOnSlide: String = "";
  let pageNumberBucket: IPageNumberBucket = {}

  if (TaskData && TaskData.length !== 0) {
    let SanitizedTaskData = SanitizeTaskData(TaskData)
    pageNumberCategory = SanitizedTaskData.pageNumberCategory;
    categoryPageNum = SanitizedTaskData.categoryPageNum;
    filePathObject = SanitizedTaskData.filePathObject;
    pageNumOnSlide = SanitizedTaskData.categoryPageNum["ALL"][0];
  }

  if (buckets && buckets.length !== 0) {
    let treeData = TreeData(buckets, pageNumberCategory);
    treeView = treeData.mainTree;
    pageNumberBucket = treeData.pageNumberBucket
  }

  return {
    treeView,
    pageNumberBucket,
    pageNumberCategory,
    categoryPageNum,
    filePathObject,
    pageNumOnSlide
  }

}

export const CustomisedTabs = styled(Tabs)({});

export const CustomisedTab = styled(Tab)({
  fontSize: "12px",
  fontWeight: "bold"
});

const FindInBucket = (buckets: any, item: ITreeNodeType):any => {
  let ID: string = item?.templateId ?? ' ';
  let Applicant = item?.parentPath[0] ?? '';
  Applicant = Applicant.split(' ').join('_')
  let FilterBucketsByApplicant :any = buckets?.filter(bucket=>bucket?.name?.substring(0,bucket?.name?.indexOf('.'))===Applicant)
  let Found:any = FilterBucketsByApplicant?.filter((bucket) => bucket?.templateId === ID);
  return Found[0]
}

const FindInTasks = (tasks :any, ID:string):any => {
  let Found = tasks?.filter((task:any) => task?.taskId === ID);
  return Found[0]
}

const FindInPages = (Pages:any, ID:string):any => {
  let Found = Pages?.filter((page:any) => pa|| nullge?.pageNumber === ID);
  return Found[0]
}


export const AlterJson = (autoOcrResponse, ItemsArr, Target, TargetTemplateId) => {
  try {
     let JSON_DATA = autoOcrResponse
    ItemsArr?.map((item, index) => {
      let PreviousBucket = FindInBucket(JSON_DATA?.buckets, item);
      let TargetBucket = FindInBucket(JSON_DATA?.buckets, Target)

      let spliceIndex = 0
      for (let i = 0; i < PreviousBucket.entities.length; i++) {
        let Arr = PreviousBucket.entities;
        if (Arr[i]?.taskId === item?.taskId) {
          if (Arr[i]?.pageNumber === item?.Page) {
            spliceIndex = i
          }
        }
      }
      let ItemToBeMoved = PreviousBucket.entities.filter((entity, index) => index === spliceIndex)
      PreviousBucket.entities.splice(spliceIndex, 1)
      if (PreviousBucket.entities.length === 0) {
        let indexOfPreviousBucket = JSON_DATA?.buckets.indexOf(PreviousBucket);
        JSON_DATA?.buckets.splice(indexOfPreviousBucket, 1);
      }

      if (TargetBucket) {
        // console.log("Target.id", Target);
        let items = ItemToBeMoved.map((item) => { return { ...item, templateId: TargetTemplateId } })
        TargetBucket.entities = [...TargetBucket.entities, ...items]
      } else {

        let bucketsLength: number = JSON_DATA.buckets.length
        let name: string = Target.id.split(' ').join('_');
        let items = ItemToBeMoved.map((item) => { return { ...item, templateId: TargetTemplateId } })

        ItemToBeMoved.map((item) => { return { ...item, templateId: TargetTemplateId } })
        let PathName: string = Target.parentPath[0].split(' ').join('_')
        let TempBucket = JSON_DATA.buckets;
        TempBucket = [...TempBucket, {
          id: "9809515c-3969-4958-b5c7-5a821c8cdd80",
          name: PathName + "." + name,
          templateId: TargetTemplateId,
          order: bucketsLength,
          entities: [...items]
        }]
        JSON_DATA.buckets = TempBucket

      }
      let PreviousTask = FindInTasks(JSON_DATA?.tasks, item?.taskId);
      let FoundPage = FindInPages(PreviousTask?.pages, item?.Page)
      let newName = Target.id.split(' ').join('_');
      FoundPage.classification.dpaText = { orig: newName, mlCorrected: newName }

    })
  } catch (error) {
    console.log(error, "error")
  }
}

interface ICreateNode {
  (id: string,setTreeData: React.Dispatch<React.SetStateAction<ITreeNodeType[]>>,pathTitle: string,templateId : string):ITreeNodeType
}

export const CreateNode : ICreateNode = (id, setTreeData, pathTitle, templateId) => {
  let NewNode: ITreeNodeType = {
    id: id,
    title: id,
    parentPath: [pathTitle],
    folder: true,
    children: [],
    templateId: templateId
  }
  setTreeData(prev => {
    console.log(prev?.filter(item => item?.id === pathTitle), "prev")
    const Node = FindNode(pathTitle, prev?.filter(item => item?.id === pathTitle));
    Node.children = [...Node.children, NewNode]
    NewNode = FindNode(id, prev?.filter(item => item?.id === pathTitle));
    return prev
  })

  return NewNode
}

export const FindNewNodeTemplateID = (newValue: string, templateListResponse: Array<IScreenTemplate>) => {
  let newTemplate:string= newValue.split(' ').join('_')
  let template : Array<IScreenTemplate>= templateListResponse.filter(eachTemplate => eachTemplate.templateName === newTemplate);
  return template[0].id;
}

export const updateSubCategoriesInTasks = (autoOcrResponse, item, nameArray) => {
  try {
    let newName = nameArray.category;
    nameArray.subCategories.forEach(subCategory => {
      newName = newName + "." + subCategory.split(' ').join('_');
    })
    let PreviousTask = FindInTasks(autoOcrResponse?.tasks, item?.taskId);
    let FoundPage = FindInPages(PreviousTask?.pages, item?.Page)
    console.log("nameArray", newName);
    FoundPage.classification.dpaText = { orig: newName, mlCorrected: newName }
  } catch (error) {
    console.log(error, "error1")
  }

}

export function getAllDocumentCategoryNames(categories: Array<IDocumentCategory>) {
  const categoryNames: Array<string> = [];
  const acronymDictionary: Record<string, string> = {};

  function processCategories(categories: Array<IDocumentCategory>) {
    categories.forEach((category: IDocumentCategory) => {

      acronymDictionary[category.categoryName.split('_').join(' ')] = category.classificationAcronym ?? '';

      if (category.classificationLevel === 2) {
        categoryNames.push(category.categoryName.split('_').join(' '));
      }
      if (category.childCategories && category.childCategories.length > 0) {
        processCategories(category.childCategories);
      }
    });
  }

  processCategories(categories);

  return {
    categoryNames,
    acronymDictionary
  };
}




export const getCategoryAndSubCategory = (documentCategories) => {
  let Classification = {};

  function RootLoop(CatObj, Obj) {
    console.log(CatObj, Obj, "rootloop")
    if (Obj[`RootSubCat${CatObj.classificationLevel}`]) {
      let tempObj = Obj[`RootSubCat${CatObj.classificationLevel}`];

      Obj[`RootSubCat${CatObj.classificationLevel}`] = {
        ...tempObj,
        [CatObj.categoryName]: { classificationLevel: CatObj.classificationLevel }

      };
    } else {
      let tempObj = Obj[`RootSubCat${CatObj.classificationLevel}`];

      Obj[`RootSubCat${CatObj.classificationLevel}`] = {
        ...tempObj,
        [CatObj.categoryName]: { classificationLevel: CatObj.classificationLevel }

      };
    }
  }

  function InnerLooper(CatObj, Obj, Root) {
    if (!Obj[`SubCat${CatObj.classificationLevel}`]) {
      let tempObj = Obj[`SubCat${CatObj.classificationLevel}`];

      Obj[`SubCat${CatObj.classificationLevel}`] = {
        ...tempObj,
        [CatObj.categoryName]: { classificationLevel: CatObj.classificationLevel },
        ...Root[`RootSubCat${CatObj.classificationLevel}`]

      };
      if (CatObj?.childCategories?.length !== 0) {
        Looper(CatObj, Obj[`SubCat${CatObj.classificationLevel}`], Root)
      }
      Root[`SubCat${CatObj.classificationLevel}`] = { ...Root[`SubCat${CatObj.classificationLevel}`], [CatObj.categoryName]: { classificationLevel: CatObj.classificationLevel } }

    } else {
      let tempObj = Obj[`SubCat${CatObj.classificationLevel}`];

      Obj[`SubCat${CatObj.classificationLevel}`] = {
        ...tempObj,
        [CatObj.categoryName]: { classificationLevel: CatObj.classificationLevel }

      };
      if (CatObj?.childCategories?.length !== 0) {
        Looper(CatObj, Obj[`SubCat${CatObj.classificationLevel}`], Root)
      }
      Root[`SubCat${CatObj.classificationLevel}`] = { ...Root[`SubCat${CatObj.classificationLevel}`], [CatObj.categoryName]: { classificationLevel: CatObj.classificationLevel } }

    }
  }


  function Looper(catObj, Obj, Root) {
    if (!Obj[catObj.categoryName]) {
      Obj[catObj.categoryName] = { classificationLevel: catObj.classificationLevel };
      catObj.childCategories?.forEach((element, index) => {
        InnerLooper(element, Obj[catObj.categoryName], Root ?? Obj[catObj.categoryName])
      });
    } else {
      Obj[catObj.categoryName] = { ...Obj[catObj.categoryName], classificationLevel: catObj.classificationLevel };
      catObj.childCategories?.forEach((element, index) => {
        InnerLooper(element, Obj[catObj.categoryName], Root ?? Obj[catObj.categoryName])
      });
    }
  }

  function LooperTwo(catObj, Obj) {
    if (!Obj[catObj.categoryName]) {
      Obj[catObj.categoryName] = { classificationLevel: catObj.classificationLevel };
      catObj.childCategories?.forEach((element, index) => {
        RootLoop(element, Obj[catObj.categoryName])
      });
    } else {
      Obj[catObj.categoryName] = { classificationLevel: catObj.classificationLevel };
      catObj.childCategories?.forEach((element, index) => {
        RootLoop(element, Obj[catObj.categoryName],)
      });
    }
  }
interface IProcessCategory { 
  categoryName:string,
childCategories : IProcessCategory[],
classificationAcronym:string
classificationLevel:number
}
  

  const processCategory = (categories: IProcessCategory[]) => {
    console.log(categories,"processCategory")
    categories.forEach((category:IProcessCategory) => {
      category?.childCategories?.forEach((doc) => {
        if (doc?.classificationLevel === 2) {
          LooperTwo(doc, Classification)
        }
      })
      console.log(Classification, "Classification1")
      category?.childCategories?.forEach((doc:IProcessCategory) => {
        if (doc?.classificationLevel === 2) {
          Looper(doc, Classification,{})
        }
      })
    });
    console.log("Classification", Classification);

  }

  processCategory(documentCategories)

  return Classification;
}
