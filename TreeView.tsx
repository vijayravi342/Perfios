//@ts-nocheck
import React, { useState, useEffect } from "react";
import SortableTree from "react-sortable-tree";
import FileExplorerTheme from 'react-sortable-tree-theme-minimal';
import "react-sortable-tree/style.css";
import AccountCircleIcon from '@material-ui/icons/AccountCircle';
import VisibilityIcon from '@material-ui/icons/Visibility';
import FolderIcon from '@material-ui/icons/Folder';
import InsertDriveFileIcon from '@material-ui/icons/InsertDriveFile';
import { useSelector, connect } from 'react-redux'
import { Button, Dialog, FormControl, IconButton, MenuItem, Paper, TextField, Tooltip } from "@material-ui/core";
import { updateTreeView, createNewApplicant, changeTab, updatePageNumOnSlide, contextMenuNode, changePageNumberCategory, changeCategoryPageNum, addSubLabel } from "actions/MultiDocClassifierActions";
import './ClassificationScreen.scss';
import SelectAllIcon from '@material-ui/icons/SelectAll';
import { AlterJson, ChangeIsSelected, FindNewNodeTemplateID, FindNode, HandleMoveNodes, PdfExtractor } from "./TreeUtility";
import PageRangeSelected from "components/MultiDocClassifierComponent/PageRangeInput";
import TreeContextMenu from "components/MultiDocClassifierComponent/TreeContextMenu";
import { IMultiDocClassifierReducer, IReducer } from "interfaces/commonInterfaces";
import { ICategoryPageNum, IPageNumberBucket, IPageNumberCategory, ITreeNodeType } from "interfaces/multiDocClassifierInterfaces";
import { IScreenTemplate } from "interfaces/uiWorkFlowInterfaces";
import { IAutoOcrResponse } from "interfaces/tableDrawingInterfaces";

interface IProps {
  multiDocClassifierReducer: IMultiDocClassifierReducer,
  updateTreeView: (treeData: Array<ITreeNodeType>) => void,
  createNewApplicant: (treeData: Array<ITreeNodeType>) => void,
  changeTab: (classification: string) => void,
  updatePageNumOnSlide: (pageNo: string) => void,
  contextMenuNode: (node: any) => void,
  changePageNumberCategory: (pageNumberCategory: IPageNumberCategory) => void,
  changeCategoryPageNum: (categoryPageNum: ICategoryPageNum) => void,
  addSubLabel: (subLabel: string) => void
}

const TreeView: React.FC<IProps> = (props) => {
  const Store = useSelector((state: IReducer) => state.multiDocClassifierReducer)
  let autoOcrResponse: Array<IAutoOcrResponse> = Store?.autoOcrResponse
  console.log("autoOcrResponse1", autoOcrResponse);
  let templateListResponse: Array<IScreenTemplate> | undefined = useSelector((state: IReducer) => state.uiWorkflowReducer.templatesList);
  const [pageNumOnSlide, setPageNumOnSlide] = useState<string>("");
  const [categoryPageNum, setCategoryPageNum] = useState<ICategoryPageNum>({});
  let [treeData, setTreeData] = useState<Array<ITreeNodeType>>([]);
  const [totalApplicants, setTotalApplicants] = useState<number>();
  const [applicant, setApplicant] = useState<string>("");
  const [subLabel, setSubLabel] = useState<string>("");
  const [isDisabled, setIsDisabled] = useState<boolean>(false);
  const [selectedNodes, setSelectedNodes] = useState<Array<ITreeNodeType>>([]);
  const [pageNumberCategory, setPageNumberCategory] = useState<IPageNumberCategory>({})
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [pageNode, setPageNode] = useState<ITreeNodeType>()
  // const classes = useStyles();
  // const excludedNodeIds = ["ALL", "IRRELEVANT", "UNCLASSIFIED"];
  useEffect(() => {
    const pageNumOnSlide: string = props.multiDocClassifierReducer.pageNumOnSlide;
    setPageNumOnSlide(pageNumOnSlide);
    const pageNumberCategory: IPageNumberCategory = props.multiDocClassifierReducer.pageNumberCategory;
    setPageNumberCategory(pageNumberCategory)
    const pageNumberBucket: IPageNumberBucket = props.multiDocClassifierReducer.pageNumberBucket;
    if (pageNumberBucket && pageNumberBucket[pageNumOnSlide] && pageNumberBucket[pageNumOnSlide].length !== 0) {
      setApplicant(pageNumberBucket[pageNumOnSlide][0]);
    }
    const categoryPageNum: ICategoryPageNum = props.multiDocClassifierReducer.categoryPageNum;
    setCategoryPageNum(categoryPageNum);
    const subLabel: string = props.multiDocClassifierReducer.subLabel;
    setSubLabel(subLabel);
  }, [props.multiDocClassifierReducer])

  useEffect(() => {
    let treeData: Array<ITreeNodeType> = props.multiDocClassifierReducer.treeView;
    console.log("treeData", treeData);

    const excludedNodeIds = ["ALL", "IRRELEVANT", "UNCLASSIFIED"];
    if (treeData && treeData.length !== 0) {
      const filteredTreeData: Array<ITreeNodeType> = treeData[0]?.children.filter(node => !excludedNodeIds.includes(node.id));
      treeData[0].children = [];
      treeData[0].children = filteredTreeData;
      setTreeData([...treeData]);
    }

    // setTreeData([...treeData]);
  }, [props.multiDocClassifierReducer.treeView])

  const handleSubLabel = (event: any) => {
    setSubLabel(event.target.value);
  }

  const handleTotalApplicant = (event: any) => {
    setTotalApplicants(event.target.value);
  }

  function createApplicantNode() {
    for (let i = 1; i <= totalApplicants; i++) {
      treeData = treeData.concat({
        "id": (i + 1),
        "title": "Applicant " + (i + 1),
        "parentPath": [],
        "folder": true,
        "children": [],
        "editable": false
      })
      props.createNewApplicant(treeData);
    }
    setIsDisabled(true);
  }

  function createSubLabelNode() {
    const currentNode: ITreeNodeType = FindNode(pageNumOnSlide, treeData);
    const parentNode: ITreeNodeType = FindNode(currentNode.category, treeData);
    const subLabelNodeInClassification: ITreeNodeType = FindNode(subLabel, parentNode.children);
    if (!subLabelNodeInClassification) {
      const subLabelNode = {
        id: subLabel,
        title: subLabel,
        parentPath: currentNode.parentPath,
        folder: true,
        children: []
      };
      parentNode.children.unshift(subLabelNode);
      setTreeData((prev) => [...prev, ...treeData]);
      props.updateTreeView(treeData);
      props.addSubLabel("");
      setSubLabel("");
    } else {
      alert("Folder already exists in the Classification")
    }
  }

  function updateTreeData(treeData: Array<ITreeNodeType>) {
    props.updateTreeView(treeData);
  }

  const viewImg = (node: ITreeNodeType) => {
    props.changeTab(node.category);
    props.updatePageNumOnSlide(node.id);
  }

  const HandleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    props.contextMenuNode(e.currentTarget)
  }

  // const HandleContextOnclick = (val: ITreeNodeType) => {
  //   let TargetNode: ITreeNodeType = val;
  //   let modifiedAutoOcrResponse: Array<IAutoOcrResponse> = AlterJson(autoOcrResponse, selectedNodes, TargetNode)
  //   const TargetNodeParentPath: Array<string> = TargetNode?.parentPath[0];
  //   const ChangedTree: Array<ITreeNodeType> = treeData?.filter(item => item.id === TargetNodeParentPath)
  //   const Found: ITreeNodeType = FindNode(TargetNode.id, ChangedTree);

  //   selectedNodes.forEach(node => {
  //     pageNumberCategory[node.id].category = TargetNode.parentPath[1] ?? TargetNode.title;
  //     pageNumberCategory[node.id].subCategories = [];
  //     let index: number = categoryPageNum[node.category].indexOf(node.id);
  //     categoryPageNum[node.category].splice(index, 1);
  //     categoryPageNum[TargetNode.parentPath[1] ?? TargetNode.title].push(node.id);
  //   })

  //   let nodes = selectedNodes.map(node =>
  //     node = {
  //       ...node,
  //       category: TargetNode.parentPath[1] ?? TargetNode.title,
  //       subCategories: [],
  //       isSelected: false,
  //       parentPath: [...TargetNode.parentPath, TargetNode.title].flat()
  //     });
  //   let children: Array<> = Found.children;
  //   Found.children = [...children, ...nodes]

  //   let groupedObj = nodes.reduce((acc, obj) => {
  //     const { parentTitle, ...rest } = obj;
  //     if (acc[parentTitle]) {
  //       acc[parentTitle].push(rest);
  //     } else {
  //       acc[parentTitle] = [rest];
  //     }
  //     return acc;
  //   }, {});

  //   let ModifyPrevParent = Object.keys(groupedObj);
  //   ModifyPrevParent.forEach((item, index) => {
  //     const FoundParent = FindNode(item, treeData)
  //     let ResultObj = FoundParent?.children.filter((obj1) => !nodes.some((obj2) => obj2.title === obj1.title));
  //     FoundParent.children = ResultObj
  //   })

  //   setTreeData((prev) => [...prev, ...treeData]);
  //   props.updateTreeView(treeData);
  //   props.changePageNumberCategory(pageNumberCategory);
  //   setSelectedNodes([]);
  //   setElement(null);
  //   props.contextMenuNode(null);
  //   props.changeTab(TargetNode.parentPath[1] ?? TargetNode.title);
  //   props.changeCategoryPageNum(categoryPageNum);
  // }

  const HandleContextOnclick = (val: ITreeNodeType) => {
    props.changeCategoryPageNum(categoryPageNum);
    const Data = HandleMoveNodes(val, treeData, selectedNodes, pageNumberCategory, categoryPageNum);
    let templateId = FindNewNodeTemplateID(val.id, templateListResponse);
    AlterJson(autoOcrResponse[0], selectedNodes, val, templateId);
    if (Data?.NoChange) {
      let ModTree = treeData
      ChangeIsSelected(Data?.UnChangedNodes, ModTree)
      props.updateTreeView(ModTree);
      setSelectedNodes([]);
      props.contextMenuNode(null);
    } else {
      let ModTree = Data?.ModifiedTreeData
      ChangeIsSelected(Data?.UnChangedNodes, ModTree)
      props.updateTreeView(ModTree);
      props.changePageNumberCategory(Data.PageNumberCategory);
      props.changeTab(Data.TargetNode_name);
      props.changeCategoryPageNum(Data.CategoryPageNum);
      setSelectedNodes([]);
      // props.updatePageNumOnSlide(categoryPageNum[])
      props.contextMenuNode(null);
    }
  }

  const handleCheckboxClick = (node: ITreeNodeType, e: any) => {
    let FoundNode = FindNode(node?.id, treeData)
    FoundNode.isSelected = e.target.checked;
    let Path = node?.parentPath ?? []
    node = {
      ...node,
      parentTitle: Path && Path.length > 0 ? Path[Path.length - 1] : null
    }
    if (selectedNodes.includes(node)) {
      setSelectedNodes(selectedNodes.filter((selectedNode) => selectedNode !== node));

    } else {
      setSelectedNodes([...selectedNodes, { ...node, isSelected: false }]);
    }

  };

  const generateNodeProps = ({ node }: any) => {

    return {
      buttons: [
        <div className='TreeNode-Button'>
          {!node.folder && (
            <VisibilityIcon className="tv-edit" onClick={() => viewImg(node)} color="action" fontSize="small" />
          )}
          {
            Object.keys(categoryPageNum).includes(node.id) &&
            <IconButton onClick={(e: any) => {
              setPageNode(node)
              setAnchorEl(e.target);
            }}><SelectAllIcon /></IconButton>
          }
        </div>

      ],
      style: {
        width: "100%",
        textAlign: "left",
        fontSize: "10px",
        display: "flex",
        alignItems: "center",
      },
      title: (
        <div className="GeneratePropNode">
          <div className='TreeNode-Title' onContextMenu={HandleContextMenu}>
            {node?.folder && (
              <>
                {node.parentPath.length === 0 ?
                  <AccountCircleIcon className="tv-folderIcon" color="action" />
                  :
                  <FolderIcon className="tv-folderIcon" color="action" fontSize="small" />
                }
              </>
            )}
            {!node.folder && (
              <>
                <input type="checkbox" checked={node?.isSelected ? true : false}
                  onChange={(e) => handleCheckboxClick(node, e)}
                />
                <InsertDriveFileIcon className="tv-folderIcon" color="action" fontSize="small" />
              </>
            )}
            {
              node.title?.length > 14 ?
                <Tooltip title={node.title} placement='top'>
                  <span className="TreeTextEllipse">{node.title}</span>
                </Tooltip>
                :
                <span>{node.title}</span>
            }

          </div>
        </div>
      )
    };

  }

  return (
    <>
      <Dialog
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <PageRangeSelected
          List={PdfExtractor(categoryPageNum[pageNode?.id]) ?? []}
          Node={pageNode ?? {}} setAnchorEl={setAnchorEl} TreeData={treeData}
          setSelectedNodes={setSelectedNodes}
        />
      </Dialog>
      <TreeContextMenu
        HandleContextOnclick={HandleContextOnclick}
        element={Store?.element}
        treeView={Store?.treeView}
        templateList={Store?.templateList}
        ChangeTree={setTreeData}
        categoryPageNum={categoryPageNum}
        templateListResponse={templateListResponse}
      />
      <div className='Tree-Container'>
        <Paper className='TreeView-Container'>
          <div className='Applicants-container'>
            <FormControl>
              <TextField
                className="Applicants-Dropdown-Component"
                select
                id='add-applicant-dropdown'
                variant="outlined"
                value={totalApplicants}
                label="Add Applicants"
                defaultValue={totalApplicants}
                onChange={handleTotalApplicant}
                size="small"
              >
                <MenuItem value={1}>1</MenuItem>
                <MenuItem value={2}>2</MenuItem>
                <MenuItem value={3}>3</MenuItem>
                <MenuItem value={4}>4</MenuItem>
                <MenuItem value={5}>5</MenuItem>
              </TextField>
            </FormControl>
            <Button className="Add-button" disabled={isDisabled} color="primary" variant="contained" onClick={createApplicantNode} size="large">Add</Button>
          </div>
          <div className='Tree-Component'>
            <SortableTree
              treeData={treeData}
              //@ts-ignore
              onChange={(treeData) => updateTreeData(treeData)}
              theme={FileExplorerTheme}
              canDrag={false}
              generateNodeProps={generateNodeProps}
              rowHeight={50}
            />
          </div>
        </Paper>
        <Paper className="Tree-Metadata-Container">
          <FormControl className="Applicant-Data">
            <TextField
              className='TextField-Component'
              id='applicant'
              variant="outlined"
              value={applicant}
              label="Applicant"
              InputProps={{
                readOnly: true,
              }}
              size="small"
            />
          </FormControl>
          <>
            <FormControl>
              <TextField
                className='TextField-Component'
                id="subLabel-input"
                variant="outlined"
                value={subLabel}
                label="Add Sub-label"
                onChange={handleSubLabel}
                size="small"
              />
            </FormControl>
            <Button className='Add-button' color="primary" variant="contained" onClick={createSubLabelNode} size="small">ADD</Button>
          </>
        </Paper>
      </div>
    </>
  );
}

const mapStateToProps = (state: any) => ({
  multiDocClassifierReducer: state.multiDocClassifierReducer
})

const mapDispatchToProps = (dispatch: any) => ({
  updateTreeView: (treeData: Array<ITreeNodeType>) => {
    dispatch(updateTreeView(treeData))
  },
  createNewApplicant: (treeData: Array<ITreeNodeType>) => {
    dispatch(createNewApplicant(treeData))
  },
  changeTab: (classification: string) => {
    dispatch(changeTab(classification))
  },
  updatePageNumOnSlide: (pageNo: string) => {
    dispatch(updatePageNumOnSlide(pageNo))
  },
  contextMenuNode: (node: any) => {
    dispatch(contextMenuNode(node))
  },
  changePageNumberCategory: (pageNumberCategory: IPageNumberCategory) => {
    dispatch(changePageNumberCategory(pageNumberCategory))
  },
  changeCategoryPageNum: (categoryPageNum: ICategoryPageNum) => {
    dispatch(changeCategoryPageNum(categoryPageNum))
  },
  addSubLabel: (subLabel: string) => {
    dispatch(addSubLabel(subLabel));
  },
})

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(TreeView);
