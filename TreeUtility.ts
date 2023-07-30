//@ts-nocheck
import { Tab, Tabs, styled } from "@material-ui/core"
import { de } from "date-fns/locale";
import { IBucket } from "interfaces/commonInterfaces"
import { ICategoryPageNum, IDocumentCategory, IHandleContextOnclickType, IHandleContextOnclickTypeNull, IPageNumberBucket, IPageNumberCategory, ITreeNodeType } from "interfaces/multiDocClassifierInterfaces";
import { ITasks } from "interfaces/tableDrawingInterfaces";
import { IScreenTemplate } from "interfaces/uiWorkFlowInterfaces";
import { template } from "lodash";

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

export const HandleMoveNodes = (
  val: ITreeNodeType,
  treeData: ITreeNodeType[],
  selectedNodes: ITreeNodeType[],
  pageNumberCategory: IPageNumberCategory,
  categoryPageNum: ICategoryPageNum,
): IHandleContextOnclickType | IHandleContextOnclickTypeNull => {
  let FilteredNodes = selectedNodes.filter(node => node.parentTitle !== val.id);
  let UnChangedNodes = selectedNodes.filter(node => node.parentTitle === val.id);
  if (FilteredNodes.length === 0) return {
    NoChange: true,
    UnChangedNodes
  }
  let TargetNode = val;
  const TargetNodeParentPath: string = TargetNode?.parentPath[0];
  const ChangedTree: ITreeNodeType[] = treeData?.filter(item => item.id === TargetNodeParentPath)
  const FoundTarget = FindNode(TargetNode.id, ChangedTree);
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
  let ModifyPrevParent = Object.keys(groupedObj);
  ModifyPrevParent.forEach((item) => {
    const FoundParent = FindNode(item, treeData)
    let ResultObj = FoundParent?.children.filter((obj1: ITreeNodeType) => !nodes.some((obj2) => obj2.title === obj1.title));
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
  console.log("categoryNum", categoryPageNum);


  return {
    pageNumberCategory,
    categoryPageNum,
    filePathObject
  }
}

function TreeData(buckets: Array<IBucket>, PageNumberCategory: IPageNumberCategory) {
  let mainTree: TreeNodeType[] = [];
  let pageNumberBucket: IPageNumberBucket = {}
  let categorynum: ICategoryPageNum = {}
  buckets.forEach((item, indexNumber) => {
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
                if (categorynum[PageNumberCategory[String(entity.taskId) + "-" + String(entity.pageNumber)].category]) {
                  categorynum[PageNumberCategory[String(entity.taskId) + "-" + String(entity.pageNumber)].category] = [...categorynum[PageNumberCategory[String(entity.taskId) + "-" + String(entity.pageNumber)].category], String(entity.taskId) + "-" + String(entity.pageNumber)]
                }
                else {
                  categorynum[PageNumberCategory[String(entity.taskId) + "-" + String(entity.pageNumber)].category] = [String(entity.taskId) + "-" + String(entity.pageNumber)];
                }
                if (categorynum['ALL']) {
                  categorynum['ALL'] = [...categorynum['ALL'], String(entity.taskId) + "-" + String(entity.pageNumber)]
                }
                else {
                  categorynum['ALL'] = [String(entity.taskId) + "-" + String(entity.pageNumber)];
                }
                newFolder.children.push({
                  id: String(entity.taskId) + "-" + String(entity.pageNumber),
                  Page: entity.pageNumber,
                  taskId: entity.taskId,
                  parentPath: [...path, name],
                  // title: "Page - " + "(" + String(entity.taskId) + ") - " + String(entity.pageNumber),
                  title: "Page - " + "(" + String(indexNumber + 1) + ") - " + String(entity.pageNumber),
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
                if (categorynum[PageNumberCategory[String(entity.taskId) + "-" + String(entity.pageNumber)].category]) {
                  categorynum[PageNumberCategory[String(entity.taskId) + "-" + String(entity.pageNumber)].category] = [...categorynum[PageNumberCategory[String(entity.taskId) + "-" + String(entity.pageNumber)].category], String(entity.taskId) + "-" + String(entity.pageNumber)]
                }
                else {
                  categorynum[PageNumberCategory[String(entity.taskId) + "-" + String(entity.pageNumber)].category] = [String(entity.taskId) + "-" + String(entity.pageNumber)];
                }
                if (categorynum['ALL']) {
                  categorynum['ALL'] = [...categorynum['ALL'], String(entity.taskId) + "-" + String(entity.pageNumber)]
                }
                else {
                  categorynum['ALL'] = [String(entity.taskId) + "-" + String(entity.pageNumber)];
                }
                Arr.push({
                  Page: entity.pageNumber,
                  id: String(entity.taskId) + "-" + String(entity.pageNumber),
                  taskId: entity.taskId,
                  parentPath: [...path, name],
                  // title: "Page - " + "(" + String(entity.taskId) + ") - " + String(entity.pageNumber),
                  title: "Page - " + "(" + String(indexNumber + 1) + ") - " + String(entity.pageNumber),
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
  console.log("categoryNum", categorynum);

  return {
    mainTree,
    pageNumberBucket,
    categorynum
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
    // categoryPageNum = treeData.categorynum
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

const FindInBucket = (buckets: any, item: ITreeNodeType) => {
  let ID: string = item?.templateId ?? ' ';
  let Applicant = item?.parentPath[0] ?? '';
  Applicant = Applicant.split(' ').join('_')
  let FilterBucketsByApplicant: any = buckets?.filter(bucket => bucket?.name?.substring(0, bucket?.name?.indexOf('.')) === Applicant)
  let Found = FilterBucketsByApplicant?.filter((bucket) => bucket?.templateId === ID);
  return Found[0]
}

const FindInTasks = (tasks, ID) => {
  let Found = tasks?.filter((item) => item?.taskId === ID);
  return Found[0]
}

const FindInPages = (Pages, ID) => {
  let Found = Pages?.filter((item) => item?.pageNumber === ID);
  return Found[0]
}

// export const AlterJson = (autoOcrResponse, ItemsArr, Target) => {
//   try {
//     ItemsArr?.map((item, index) => {
//       let PreviousBucket = FindInBucket(autoOcrResponse?.buckets, item?.templateId);
//       let ItemToBeMoved = PreviousBucket.entities.filter((entity) => entity.pageNumber === item.Page)
//       let TargetBucket = FindInBucket(autoOcrResponse?.buckets, Target?.templateId);
//       console.log("ItemsArr", ItemsArr);

//       let spliceIndex = 0
//       for (let i = 0; i < PreviousBucket.entities.length; i++) {
//         let Arr = PreviousBucket.entities;
//         if (Arr[i]?.taskId === item?.taskId) {
//           if (Arr[i]?.pageNumber === item?.Page) {
//             spliceIndex = i
//           }
//         }
//       }
//       PreviousBucket.entities.splice(spliceIndex, 1)
//       if (TargetBucket) {
//         // ItemsArr.forEach(eachItem => {
//         //   eachItem.templateId = TargetBucket.templateId
//         // })
//         // console.log("TargetBucket", TargetBucket);
//         TargetBucket.entities = [...TargetBucket.entities, ...ItemToBeMoved]
//       } else {
//         let bucketsLength: number = autoOcrResponse.buckets.length
//         autoOcrResponse.buckets.push({
//           id: "9809515c-3969-4958-b5c7-5a821c8cdd80",
//           name: "Applicant_1.CUSTOMER_RELATIONSHIP_FORM",
//           templateId: "9809515c-3969-4958-b5c7-5a821c8cdd80",
//           order: bucketsLength,
//           entities: [...ItemsArr]
//         })
//       }

//       let PreviousTask = FindInTasks(autoOcrResponse?.tasks, item?.taskId);
//       let FoundPage = FindInPages(PreviousTask?.pages, item?.Page)
//       let newName = Target.id.split(' ').join('_');
//       FoundPage.PageNumberCategory[String(entity.taskId) + "-" + String(entity.pageNumber)].category.dpaText = { orig: newName, mlCorrected: newName }
//     })
//   } catch (error) {
//     alert("Update AutoOcrResponse Error")
//   }
// }

// export const AlterJson = (autoOcrResponse, ItemsArr, Target, TargetTemplateId) => {
//   try {

//     ItemsArr?.map((item, index) => {
//       let PreviousBucket = FindInBucket(autoOcrResponse?.buckets, item?.templateId);
//       let TargetBucket = FindInBucket(autoOcrResponse?.buckets, Target?.templateId)
//       console.log("TargetBucket", TargetBucket);

//       let spliceIndex = 0
//       for (let i = 0; i < PreviousBucket.entities.length; i++) {
//         let Arr = PreviousBucket.entities;
//         if (Arr[i]?.taskId === item?.taskId) {
//           if (Arr[i]?.pageNumber === item?.Page) {
//             spliceIndex = i
//           }
//         }
//       }
//       let ItemToBeMoved = PreviousBucket.entities.filter((entity, index) => index === spliceIndex)
//       PreviousBucket.entities.splice(spliceIndex, 1)
//       if (PreviousBucket.entities.length === 0) {
//         let indexOfPreviousBucket = autoOcrResponse?.buckets.indexOf(PreviousBucket);
//         autoOcrResponse?.buckets.splice(indexOfPreviousBucket, 1);
//       }

//       if (TargetBucket) {
//         // console.log("Target.id", Target);
//         let items = ItemToBeMoved.map((item) => { return { ...item, templateId: TargetTemplateId } })
//         TargetBucket.entities = [...TargetBucket.entities, ...items]
//       } else {

//         let bucketsLength: number = autoOcrResponse.buckets.length
//         let name: string = Target.id.split(' ').join('_');
//         let items = ItemToBeMoved.map((item) => { return { ...item, templateId: TargetTemplateId } })

//         ItemToBeMoved.map((item) => { return { ...item, templateId: TargetTemplateId } })
//         autoOcrResponse.buckets.push({
//           id: "9809515c-3969-4958-b5c7-5a821c8cdd80",
//           name: "Applicant_1." + name,
//           templateId: TargetTemplateId,
//           order: bucketsLength,
//           entities: [...items]
//         })
//       }

//       let PreviousTask = FindInTasks(autoOcrResponse?.tasks, item?.taskId);
//       let FoundPage = FindInPages(PreviousTask?.pages, item?.Page)
//       let newName = Target.id.split(' ').join('_');
//       FoundPage.classification.dpaText = { orig: newName, mlCorrected: newName }
//     })
//   } catch (error) {
//     console.log(error, "error")
//   }
// }

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
    console.log("updatedjson", updatedjson);

  } catch (error) {
    console.log(error, "error")
  }
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

export const CreateNode = (id, setTreeData, pathTitle, templateId) => {
  let NewNode: ITreeNodeType = {
    id: id,
    title: id,
    parentPath: [pathTitle],
    folder: true,
    children: [],
    templateId: templateId
  }
  setTreeData(prev => {
    const Node = FindNode(pathTitle, prev);
    Node.children = [...Node.children, NewNode]
    NewNode = FindNode(id, prev);
    return prev
  })

  return NewNode
}

export const FindNewNodeTemplateID = (newValue: string, templateListResponse: Array<IScreenTemplate> | undefined) => {
  let newTemplate = newValue.split(' ').join('_')
  let template = templateListResponse.filter(eachTemplate => eachTemplate.templateName === newTemplate)
  return template[0].id;
}

export function getAllDocumentCategoryNames(categories: Array<IDocumentCategory>) {
  const categoryNames: Array<string> = [];
  const acronymDictionary: Record<string, string> = {};

  function processCategories(categories: Array<IDocumentCategory>) {
    categories.forEach((category: IDocumentCategory) => {

      acronymDictionary[category.categoryName.split('_').join(' ')] = category.classificationAcronym || null;

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
    if (Obj[`Rootsubcat${CatObj.classificationLevel}`]) {
      let tempObj = Obj[`Rootsubcat${CatObj.classificationLevel}`];

      Obj[`Rootsubcat${CatObj.classificationLevel}`] = {
        ...tempObj,
        [CatObj.categoryName]: { classificationLevel: CatObj.classificationLevel }

      };
    } else {
      let tempObj = Obj[`Rootsubcat${CatObj.classificationLevel}`];

      Obj[`Rootsubcat${CatObj.classificationLevel}`] = {
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
        ...Root[`Rootsubcat${CatObj.classificationLevel}`]

      };
      if (CatObj?.childCategories?.length !== 0) {
        console.log("entered subcat 22")
        Looper(CatObj, Obj[`SubCat${CatObj.classificationLevel}`], Root)
      }
      // Root[`SubCat${CatObj.classificationLevel}`] = { ...Root[`SubCat${CatObj.classificationLevel}`], [CatObj.categoryName]: { classificationLevel: CatObj.classificationLevel } }

    } else {
      let tempObj = Obj[`SubCat${CatObj.classificationLevel}`];

      Obj[`SubCat${CatObj.classificationLevel}`] = {
        ...tempObj,
        [CatObj.categoryName]: { classificationLevel: CatObj.classificationLevel }

      };
      if (CatObj?.childCategories?.length !== 0) {
        console.log("entered subcat 22")
        Looper(CatObj, Obj[`SubCat${CatObj.classificationLevel}`], Root)
      }
      // Root[`SubCat${CatObj.classificationLevel}`] = { ...Root[`SubCat${CatObj.classificationLevel}`], [CatObj.categoryName]: { classificationLevel: CatObj.classificationLevel } }

    }
  }


  function Looper(catObj, Obj, Root) {
    console.log(catObj, Obj, Root, "catObj, Obj,Root")
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


  function processCategory(categories) {
    categories.forEach((category) => {
      category?.childCategories?.forEach((doc) => {
        if (doc?.classificationLevel === 2) {
          LooperTwo(doc, Classification)
          // Looper(doc,Classification)
        }
      })
      console.log(Classification, "Classification1")
      category?.childCategories?.forEach((doc) => {
        if (doc?.classificationLevel === 2) {
          Looper(doc, Classification)
        }
      })
    });
    console.log("Classification", Classification);

  }

  processCategory(documentCategories)

  return Classification;
}
