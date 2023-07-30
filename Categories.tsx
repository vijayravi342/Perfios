//@ts-nocheck
import React, { useEffect } from 'react';
import { Box, Grid, Paper, TextField } from '@material-ui/core';
import { useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { changeCategoryPageNum, changePageNumberCategory, changeTab, updateTreeView } from 'actions/MultiDocClassifierActions';
import { Autocomplete } from '@material-ui/lab';
import { AlterJson, FindNewNodeTemplateID, FindNode, getAllDocumentCategoryNames, getCategoryAndSubCategory, updateSubCategoriesInTasks } from './TreeUtility';
import { ICategoryPageNum, IDocumentCategory, IPageNumberCategory, ITreeNodeType } from 'interfaces/multiDocClassifierInterfaces';
import { IMultiDocClassifierReducer, IReducer } from 'interfaces/commonInterfaces';
import { IAutoOcrResponse } from 'interfaces/tableDrawingInterfaces';
import { IScreenTemplate } from 'interfaces/uiWorkFlowInterfaces';
// import categoryjson from './categories.json';

interface IProps {
  multiDocClassifierReducer: IMultiDocClassifierReducer,
  updateTreeView: (treeData: Array<ITreeNodeType>) => void,
  changePageNumberCategory: (pageNumberCategory: IPageNumberCategory) => void
  changeTab: (classification: string) => void
  changeCategoryPageNum: (categoryPageNum: ICategoryPageNum) => void
}

const Categories: React.FC<IProps> = (props) => {
  const [templateList, setTemplateList] = useState<Array<string>>([])
  const [irrelevantCategoriesList, setIrrelevantCategoriesList] = useState<Array<string>>([])
  const [category, setCategory] = useState<string>("");
  const [categoryPageNum, setCategoryPageNum] = useState<ICategoryPageNum>({});
  const [pageNumOnSlide, setPageNumOnSlide] = useState<string>("");
  const [pageNumberCategory, setPageNumberCategory] = useState<IPageNumberCategory>({});
  let [treeData, setTreeData] = useState<Array<ITreeNodeType>>([]);
  const [inputCategoryValue, setInputCategoryValue] = useState<string>("");
  // const [inputSubCategoryValue, setInputSubCategoryValue] = useState("");
  // const [subcategory, setSubCategory] = useState("");
  const [irrelevantCategory, setIrrelevantCategory] = useState<string>("");
  const Store = useSelector((state: IReducer) => state.multiDocClassifierReducer)
  let autoOcrResponse: Array<IAutoOcrResponse> = Store?.autoOcrResponse
  let templateListResponse: Array<IScreenTemplate> | undefined = useSelector((state: IReducer) => state.uiWorkflowReducer.templatesList);
  // const [categoryAndSubCategoryDropDownObject, setCategoryAndSubCategoryDropDownObject] = useState({})
  const [optionsObject, setOptionObject] = useState({});
  const [filteredDropdown, setFilteredDropDown] = useState([]);

  useEffect(() => {
    const documentCategories: Array<IDocumentCategory> = props.multiDocClassifierReducer.documentCategories;
    const institutionNames = props.multiDocClassifierReducer.institutionNames;
    console.log("institutionNames", institutionNames);

    const templateList: Array<string> = props.multiDocClassifierReducer.templateList;
    setTemplateList(templateList);
    const allDocumentsTypeList: Array<string> = getAllDocumentCategoryNames(documentCategories).categoryNames;
    let irrelevantCategoriesList: Array<string> = allDocumentsTypeList.filter((value) => !templateList.includes(value));
    irrelevantCategoriesList.push('OTHERS');
    setIrrelevantCategoriesList(irrelevantCategoriesList);
    let CategoryAndSubCategoryDropDownObject = getCategoryAndSubCategory(documentCategories);
    // setCategoryAndSubCategoryDropDownObject(CategoryAndSubCategoryDropDownObject);

    // console.log("CategoryAndSubCategoryDropDownObject", CategoryAndSubCategoryDropDownObject['AADHAR']);
    const treeData = props.multiDocClassifierReducer.treeView;
    { treeData && setTreeData([...treeData]) }
    const pageNumberCategory: IPageNumberCategory = props.multiDocClassifierReducer.pageNumberCategory;
    console.log("pageNumberCategory", pageNumberCategory);
    setPageNumberCategory(pageNumberCategory);
    const pageNumOnSlide = props.multiDocClassifierReducer.pageNumOnSlide;

    setPageNumOnSlide(pageNumOnSlide);
    if (pageNumberCategory && pageNumberCategory[pageNumOnSlide] && pageNumberCategory[pageNumOnSlide].category) {
      let category: string = pageNumberCategory[pageNumOnSlide].category
      setCategory(category);
      setInputCategoryValue(category);

      let keyArr = category && CategoryAndSubCategoryDropDownObject[category.split(' ').join('_')] && Object.keys((CategoryAndSubCategoryDropDownObject[category.split(' ').join('_')]));

      let FilteredDropdown = keyArr && keyArr?.filter(item => item.includes("SubCat"));
      setFilteredDropDown(FilteredDropdown);
      let dummyObject = {}
      FilteredDropdown && FilteredDropdown.forEach((item, index) => {
        let optionsArr = CategoryAndSubCategoryDropDownObject[category.split(' ').join('_')][item] && Object.keys(CategoryAndSubCategoryDropDownObject[category.split(' ').join('_')][item])
        optionsArr = optionsArr.map(word => word.split('_').join(' '));
        dummyObject = {
          ...dummyObject,
          [index]: optionsArr
        }
      })
      setOptionObject(dummyObject);
    }
    const categoryPageNum = props.multiDocClassifierReducer.categoryPageNum;
    { categoryPageNum && setCategoryPageNum(categoryPageNum) }

  }, [props.multiDocClassifierReducer])


  // const handleCategoryChange = (newValue: string, pageNumOnSlide: string) => {
  //   setCategory(newValue);

  //   if (templateList.includes(newValue)) {
  //     pageNumberCategory[pageNumOnSlide].category = newValue;
  //     pageNumberCategory[pageNumOnSlide].subCategories = [];
  //     let FoundPage = FindNode(pageNumOnSlide, treeData[0]?.children);
  //     let Found = FindNode(newValue, treeData[0]?.children);
  //     let templateId = FindNewNodeTemplateID(newValue, templateListResponse)

  //     if (Found) {
  //       console.log("found1", pageNumberCategory, FoundPage, Found, templateId, categoryPageNum);
  //       console.log("found2", pageNumOnSlide);
  //       console.log("Found", Found);

  //       let index = categoryPageNum[FoundPage.category].indexOf(FoundPage.id);
  //       categoryPageNum[FoundPage.category].splice(index, 1);
  //       if (categoryPageNum[FoundPage.category].length === 0) {
  //         delete categoryPageNum[FoundPage.category];
  //       }
  //       categoryPageNum[newValue].push(FoundPage.id);

  //       let groupedObj: any = {};
  //       groupedObj[FoundPage?.parentPath[FoundPage?.parentPath?.length - 1]] = [FoundPage]

  //       FoundPage = {
  //         ...FoundPage,
  //         category: Found.title,
  //         subCategories: [],
  //         parentPath: [...Found.parentPath, Found.title].flat()
  //       }

  //       let children = Found.children;
  //       Found.children = [...children, FoundPage]

  //       let ModifyPrevParent = Object.keys(groupedObj);
  //       ModifyPrevParent.forEach((item, _index) => {
  //         const FoundParent = FindNode(item, treeData[0]?.children)
  //         let ResultObj = FoundParent?.children.filter((obj1: any) => ![FoundPage].some((obj2) => obj2.title === obj1.title));
  //         FoundParent.children = ResultObj;

  //         if (FoundParent.children.length === 0) {
  //           console.log("FoundParent", FoundParent);
  //           let RootNode = FindNode(FoundParent.parentPath[0], treeData)
  //           let indexOfEmptyNode = RootNode.children.indexOf(FoundParent);
  //           RootNode.children.splice(indexOfEmptyNode, 1)
  //         }
  //       })
  //       AlterJson(autoOcrResponse[0], [FoundPage], Found, templateId)
  //       setTreeData((prev) => [...prev, ...treeData]);
  //       props.updateTreeView(treeData);
  //       props.changePageNumberCategory(pageNumberCategory);
  //       props.changeTab(newValue);
  //       props.changeCategoryPageNum(categoryPageNum);

  //     }
  //     else {
  //       let path = treeData[0].children[0].parentPath
  //       treeData[0].children.push(
  //         {
  //           id: newValue,
  //           title: newValue,
  //           parentPath: path,
  //           templateId: templateId,
  //           folder: true,
  //           children: []
  //         }
  //       )
  //       setTreeData((prev) => [...prev, ...treeData]);

  //       props.updateTreeView(treeData);
  //       categoryPageNum[newValue] = [];
  //       props.changeCategoryPageNum(categoryPageNum);
  //       handleCategoryChange(newValue, pageNumOnSlide);
  //     }
  //   }
  // };
  const handleCategoryChange = (newValue: string, pageNumOnSlide: string) => {
    setCategory(newValue);

    if (templateList.includes(newValue)) {
      pageNumberCategory[pageNumOnSlide].category = newValue;
      pageNumberCategory[pageNumOnSlide].subCategories = [];
      let FoundPage = FindNode(pageNumOnSlide, treeData);
      let Found = FindNode(newValue, treeData[0]?.children);
      let templateId = FindNewNodeTemplateID(newValue, templateListResponse)
      if (Found) {
        console.log("Found", Found);

        let index = categoryPageNum[FoundPage.category].indexOf(FoundPage.id);
        categoryPageNum[FoundPage.category].splice(index, 1);
        if (categoryPageNum[FoundPage.category].length === 0) {
          delete categoryPageNum[FoundPage.category];
        }
        categoryPageNum[newValue].push(FoundPage.id);

        let groupedObj: any = {};
        groupedObj[FoundPage?.parentPath[FoundPage?.parentPath?.length - 1]] = [FoundPage]

        FoundPage = {
          ...FoundPage,
          category: Found.title,
          subCategories: [],
          parentPath: [...Found.parentPath, Found.title].flat()
        }

        let children = Found.children;
        Found.children = [...children, FoundPage]

        let ModifyPrevParent = Object.keys(groupedObj);
        ModifyPrevParent.forEach((item, _index) => {
          const FoundParent = FindNode(item, treeData)
          console.log("found3", FoundParent, groupedObj, ModifyPrevParent);

          let ResultObj = FoundParent?.children.filter((obj1: any) => ![FoundPage].some((obj2) => obj2.title === obj1.title));
          FoundParent.children = ResultObj;

          // if (FoundParent.children.length === 0) {
          //   let RootNode = FindNode(FoundParent.parentPath[0], treeData)
          //   let indexOfEmptyNode = RootNode.children.indexOf(FoundParent);
          //   RootNode.children.splice(indexOfEmptyNode, 1)
          // }
        })

        AlterJson(autoOcrResponse[0], [FoundPage], Found, templateId)
        // dispatch(setAutoOcr(autoOcrResponseArray));
        setTreeData((prev) => [...prev, ...treeData]);
        props.updateTreeView(treeData);
        props.changePageNumberCategory(pageNumberCategory);
        props.changeTab(newValue);
        props.changeCategoryPageNum(categoryPageNum);

      }
      else {
        let path = treeData[0]?.children[0]?.parentPath
        treeData[0].children.push(
          {
            id: newValue,
            title: newValue,
            parentPath: path,
            templateId: templateId,
            folder: true,
            children: []
          }
        )
        setTreeData((prev) => [...prev, ...treeData]);

        props.updateTreeView(treeData);
        categoryPageNum[newValue] = [];
        props.changeCategoryPageNum(categoryPageNum);
        handleCategoryChange(newValue, pageNumOnSlide);
      }
    }
  };

  const handleIrrelevantCategoryChange = (newValue: string | null) => {
    setIrrelevantCategory(newValue)
  }


  // let keyArr = category && categoryAndSubCategoryDropDownObject[category.split(' ').join('_')] && Object.keys((categoryAndSubCategoryDropDownObject[category.split(' ').join('_')]));
  // let filteredDropdown = keyArr && keyArr?.filter(item => item.includes("SubCat"));

  // filteredDropdown && filteredDropdown.forEach((item, index) => {
  //   dummyObject = {
  //     ...dummyObject,
  //     [index]: categoryAndSubCategoryDropDownObject[category.split(' ').join('_')][item] && Object.keys(categoryAndSubCategoryDropDownObject[category.split(' ').join('_')][item])
  //   }
  // })

  // useEffect(() => {
  //   setOptionObject(dummyObject)
  // }, [dummyObject])

  // console.log("optionsObject", optionsObject);
  // console.log("categoryAndSubCategoryDropDownObject", categoryAndSubCategoryDropDownObject);

  const handleSubCategoryChange = (val: string, newValue: string, index: number) => {
    if (newValue !== null) {

      // let classificationLevel = categoryAndSubCategoryDropDownObject[category.split(' ').join('_')][val][newValue.split(' ').join('_')].classificationLevel;
      // let optionsArr = classificationLevel && Object.keys(categoryAndSubCategoryDropDownObject[category.split(' ').join('_')][val][newValue.split(' ').join('_')][`SubCat${classificationLevel + 1}`])
      // console.log("optionsArr", optionsArr);
      // optionsArr = optionsArr.map(word => word.split('_').join(' '));
      // setOptionObject({
      //   ...optionsObject,
      //   [index + 1]: optionsArr
      // })

      // setSubCategory(newValue);

      pageNumberCategory[pageNumOnSlide].subCategories[index] = newValue;
      let FoundPage = FindNode(pageNumOnSlide, treeData[0]?.children);
      FoundPage.subCategories[index] = newValue;
      props.changePageNumberCategory(pageNumberCategory);
      updateSubCategoriesInTasks(autoOcrResponse[0], FoundPage, pageNumberCategory[pageNumOnSlide])
    }
  }

  return (
    <Paper className='Categories-Container'>
      <Grid container spacing={2} alignItems="center">
        <Grid item>
          <Autocomplete
            className='categories-autocomplete-component'
            id="category-autocomplete-dropdown"
            options={templateList ?? []}
            value={category}
            onChange={(_event: any, newValue: string | null) => handleCategoryChange(newValue, pageNumOnSlide)}
            // onChange={(event: any, newValue: string | null) => setCategory(newValue)}
            inputValue={inputCategoryValue}
            onInputChange={(_event: any, newInputValue: string) => {
              setInputCategoryValue(newInputValue);
            }}
            getOptionLabel={(option) => option}
            renderInput={(params) => <TextField {...params} label="Select Category" variant="outlined" />}
            size='small'
          />
        </Grid>
        {category && category !== 'IRRELEVANT' && filteredDropdown &&
          filteredDropdown.map((val, index) =>
            <Grid item>
              <Autocomplete
                className='subcategories-autocomplete-component'
                id="category-autocomplete-dropdown"
                options={optionsObject[index]}
                value={pageNumberCategory[pageNumOnSlide]?.subCategories[index]}
                onChange={(_event: any, newValue: string | null) => handleSubCategoryChange(val, newValue, index)}
                getOptionLabel={(option) => option}
                renderInput={(params) => <TextField {...params} label={"Select Sub-Category " + (index + 1)} variant="outlined" />}
                size='small'
              />
            </Grid>
          )
        }
        {category === 'IRRELEVANT' &&
          <Grid item>
            <Autocomplete
              className='subcategories-autocomplete-component'
              id="category-autocomplete-dropdown"
              options={irrelevantCategoriesList ?? []}
              value={irrelevantCategory}
              onChange={(_event: any, newValue: string | null) => handleIrrelevantCategoryChange(newValue)}
              getOptionLabel={(option) => option}
              renderInput={(params) => <TextField {...params} label="Select Irrelevant Category" variant="outlined" />}
              size='small'
            />
          </Grid>
        }
      </Grid>
    </Paper>
  );
}

const mapStateToProps = (state: any) => ({
  multiDocClassifierReducer: state.multiDocClassifierReducer
})

const mapDispatchToProps = (dispatch: any) => ({
  updateTreeView: (treeData: Array<ITreeNodeType>) => {
    dispatch(updateTreeView(treeData))
  },
  changePageNumberCategory: (pageNumberCategory: IPageNumberCategory) => {
    dispatch(changePageNumberCategory(pageNumberCategory))
  },
  changeTab: (classification: string) => {
    dispatch(changeTab(classification))
  },
  changeCategoryPageNum: (categoryPageNum: ICategoryPageNum) => {
    dispatch(changeCategoryPageNum(categoryPageNum))
  }
})

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Categories);
